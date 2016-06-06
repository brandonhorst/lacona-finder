/** @jsx createElement */

import { createElement } from 'elliptical'
import { Application, PreferencePane, RunningApplication, ContentArea, MountedVolume, File, Directory, ContactCard, URL, Command } from 'lacona-phrases'
import { openURL, openFile, unmountAllVolumes, runApplescript } from 'lacona-api'

import _ from 'lodash'
import demoExecute from './demo'

export const Open = {
  extends: [Command],

  execute (result) {
    if (result.verb === 'open') {
      result.items.forEach(item => {
        if (result.apps) {
          result.apps.forEach(app => {
            if (item.url) {
              app.openURL(item.url)
            } else if (item.path) {
              app.openFile(item.path)
            }
          })
        } else {
          if (item.open) {
            item.open()
          } else if (item.url) {
            openURL({url: item.url})
          } else if (item.path) {
            openFile({path: item.path})
          }
        }
      })
    } else if (['reveal', 'delete'].indexOf(result.verb) >= 0) {
      var callback = function() {
        if (result.verb === 'reveal') {
          runApplescript({script: 'tell app "Finder" to activate'}, function(){})
        }
      }

      var script; 
      result.items.forEach(item => {
        script = 'tell app "Finder" to ' + result.verb + ' (POSIX file "' + item.path + '")'
        runApplescript({script: script}, callback)
      })
    } else if (result.verb === 'move') {
      var script;
      result.items.forEach(item => {
        script = (
          'on formatPath(thePath) \n' +
            'set homedir to (do shell script "cd ~ && pwd") \n' +
            'if thePath starts with "~" then \n' +
              'set thePath to homedir & (text 2 through -1 of thePath) as string \n' +
            'end if \n' +
            'return thePath \n' +
          'end formatPath \n' +

          'tell app "Finder" \n' +
						'set src to item (my formatPath("' + item.source + '") as POSIX file) \n' +
						'set dst to item (my formatPath("' + result.dest + '") as POSIX file) \n' +
            'set srcName to name of src \n' +
            'set dstName to name of dst \n' +
            'try \n' +
              'move src to dst \n' +
            'on error errStr number errorNumber \n' +
              'display notification (srcName & " already exists in " & dstName) with title "Move failed" \n' +
            'end try \n' +
          'end tell'
          )
        console.log(script)
        runApplescript({script: script}, function(){})
      })
    } else if (result.verb === 'switch') {
      if (result.item.activate) result.item.activate()
    } else if (result.verb === 'relaunch') {
      _.forEach(result.items, item => {
        if (item.quit) item.quit((err) => {
          if (err) {
            console.log('Error quitting')
            console.error(err)
          } else {
            item.launch()
          }
        })
      })
    } else if (result.verb === 'quit') {
      _.forEach(result.items, item => {
        if (item.quit) item.quit()
      })
    } else if (result.verb === 'close') {
      _.forEach(result.items, item => {
        if (item.close) item.close()
      })
    } else if (result.verb === 'hide') {
      _.forEach(result.items, item => {
        if (item.hide) item.hide()
      })
    } else if (result.verb === 'eject') {
      _.forEach(result.items, item => {
        if (item.eject) item.eject()
      })
    } else if (result.verb === 'eject-all') {
      unmountAllVolumes()
    }
  },

  demoExecute,

  // TODO add canOpen, canEject, ... support
  describe () {
    return (
      <filter outbound={filterOutput}>
        <choice>
          <sequence>
            <literal text='open ' category='action' id='verb' value='open' />
            <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />} ellipsis>
              <choice>
                <Application />
                <PreferencePane />
                <MountedVolume />
                <URL splitOn={/\s|,/} id='url' />
                <Directory id='path' />
                <File id='path' />
                <ContactCard />
              </choice>
            </repeat>
            <list items={[' in ', ' using ', ' with ']} limit={1} category='conjunction' id='openin' value />
            <repeat unique id='apps' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
              <Application suppressEmpty={false} />
            </repeat>
          </sequence>
          <sequence>
            <literal text='reveal ' id='verb' category='action' value='reveal' />
            <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />} >
              <choice>
                <Directory id='path' />
                <File id='path' />
              </choice>
            </repeat>
            <literal text=' in Finder' />
          </sequence>
          <sequence>
            <literal text='delete ' id='verb' category='action' value='delete' />
            <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />} ellipsis>
              <choice>
                <Directory id='path' />
                <File id='path' />
              </choice>
            </repeat>
          </sequence>
          <sequence>
            <literal text='move ' id='verb' category='action' value='delete' />
            <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />} >
              <choice>
                <Directory id='path' />
                <File id='path' />
              </choice>
            </repeat>
            <literal text=' to Trash' />
          </sequence>
          <sequence score={2}>
            <literal text='move ' id='verb' category='action' value='move' />
            <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />} >
              <choice>
                <Directory id='source' />
                <File id='source' />
              </choice>
            </repeat>
            <literal text=' to ' />
            <Directory id='dest' />
          </sequence>
          <sequence>
            <list items={['switch to ', 'activate ']} id='verb' value='switch' />
            <choice id='item'>
              <RunningApplication suppressEmpty={false} />
              <ContentArea />
            </choice>
          </sequence>
          <sequence>
            <literal text='relaunch ' id='verb' value='relaunch' />
            <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />}>
              <RunningApplication suppressEmpty={false} />
            </repeat>
          </sequence>
          <sequence>
            <list items={['quit ', 'kill ']} id='verb' value='quit' />
            <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />}>
              <RunningApplication suppressEmpty={false} />
            </repeat>
          </sequence>
          <sequence>
            <list items={['hide ']} id='verb' value='hide' />
            <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />}>
              <RunningApplication suppressEmpty={false} />
            </repeat>
          </sequence>
          <sequence>
            <literal text='close ' id='verb' value='close' />
            <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />}>
              <choice>
                <RunningApplication suppressEmpty={false} />
                <ContentArea />
              </choice>
            </repeat>
          </sequence>
          <sequence>
            <list items={['eject ', 'unmount ', 'dismount ']} category='action' id='verb' value='eject' />
            <choice merge>
              <list items={['all', 'everything', 'all devices', 'all drives', 'all volumes']} limit={1} category='action' id='verb' value='eject-all' />
              <repeat id='items' separator={<list items={[', ', ', and ', ' and ']} limit={1} />}>
                <MountedVolume suppressEmpty={false} />
              </repeat>
            </choice>
          </sequence>
        </choice>
      </filter>
    )
  }
}

function filterOutput (option) {
  const result = option.result
  if (result.openin && _.some(result.items, item => item.open)) {
    return false
  }

  if (result.verb === 'eject' &&
      _.some(result.items, item => item && !item.eject)) {
    return false
  }


  if (result.verb === 'switch' && result.item && !result.item.activate) {
    return false
  }

  if (result.verb === 'hide' &&
      _.some(result.items, item => item && !item.hide)) {
    return false
  }

  if (result.verb === 'quit' &&
      _.some(result.items, item => item && !item.quit)) {
    return false
  }

  if (result.verb === 'relaunch' &&
      _.some(result.items, item => item && (!item.quit || !item.launch))) {
    return false
  }

  if (result.verb === 'close' &&
      _.some(result.items, item => item && !item.close)) {
    return false
  }

  if (['open', 'reveal', 'delete', 'move'].indexOf(option.result.verb) >= 0) {
    const counts = _.chain(result.items)
      .filter('limitId')
      .countBy('limitId')
      .value()
    if (_.some(counts, count => count > 1)) {
      return false
    }
  }

  return true
}

export default [Open]
