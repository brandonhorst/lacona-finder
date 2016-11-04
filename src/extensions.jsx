/** @jsx createElement */

import { createElement } from 'elliptical'
import { Application, PreferencePane, RunningApplication, ContentArea, MountedVolume, File, Directory, ContactCard, URL, String, Command } from 'lacona-phrases'
import { openURL, openFile, unmountAllVolumes, runApplescript, showNotification } from 'lacona-api'

import _ from 'lodash'
import demoExecute from './demo'

export const Open = {
  extends: [Command],

  async execute (result) {
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
      const scriptPromises = _.map(result.items, item => {
        const file = item.path || item
        const script = 'tell app "Finder" to ' + result.verb + ' (POSIX file "' + file + '")'
        return runApplescript({script: script})
      })

      await Promise.all(scriptPromises)

      if (result.verb === 'reveal') {
        await runApplescript({script: 'tell app "Finder" to activate'}, function(){})
      }
    } else if (['move', 'duplicate'].indexOf(result.verb) >= 0) {
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
            'set src to item (my formatPath("' + item + '") as POSIX file) \n' +
            'set dst to item (my formatPath("' + result.dest + '") as POSIX file) \n' +
            'set srcName to name of src \n' +
            'set dstName to name of dst \n' +
            'try \n' +
              result.verb + ' src to dst \n' +
            'on error errStr number errorNumber \n' +
              'display notification (srcName & " already exists in " & dstName) with title "Move failed" \n' +
            'end try \n' +
          'end tell'
          )
        runApplescript({script: script}, function(){})
      })
    } else if (result.verb === 'switch') {
      result.item.activate()
    } else if (result.verb === 'relaunch') {
      _.forEach(result.items, item => {
        item.quit().then(() => {
          item.launch()
        }).catch(err => {
          console.error('Error quitting running app', err)
        })
      })
    } else if (result.verb === 'quit') {
      _.forEach(result.items, item => {
        item.quit()
      })
    } else if (result.verb === 'close') {
      _.forEach(result.items, item => {
        item.close()
      })
    } else if (result.verb === 'hide') {
      _.forEach(result.items, item => {
        item.hide()
      })
    } else if (result.verb === 'eject') {
      if (result.items.length === 1) {
        result.items[0].eject().then(() => {
          return showNotification({
            title: `Successfully ejected ${result.items[0].name}`
          })
        }).catch(e => {
          console.error('Error ejecting volume', result.items[0].name, e)
          return showNotification({
            title: `Error ejecting ${result.items[0].name}`
          })
        })
      } else {
        const ejectPromises = _.map(result.items, item => item.eject())
        Promise.all(ejectPromises).then(() => {
          return showNotification({
            title: `Successfully ejected volumes`
          })
        }).catch(e => {
          console.error('Error ejecting volumes', result.items, e)
          return showNotification({
            title: `Error ejecting volumes`
          })
        })
      }
    } else if (result.verb === 'eject-all') {
      unmountAllVolumes().then(() => {
        showNotification({
          title: `Successfully ejected all volumes`
        })
      })
    }
  },

  demoExecute,

  describe ({config}) {
    return (
      <filter outbound={filterOutput}>
        <choice>
          <sequence>
            <literal text='open ' id='verb' value='open' score={2} />
            <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />} ellipsis unique>
              <choice>
                {config.enableOpenApplications ? <Application /> : null}
                {config.enableOpenPreferences ? <PreferencePane /> : null}
                {config.enableOpenVolumes ? <MountedVolume /> : null}
                {config.enableOpenURLs ? <URL splitOn={/\s|,/} id='url' /> : null}
                {config.enableOpenDirectories ? <Directory id='path' splitOn={/\s|,/} multiplier={0.5} /> : null}
                {config.enableOpenFiles ? <File id='path' splitOn={/\s|,/} multiplier={0.5} /> : null}
                {config.enableOpenContacts ? <ContactCard /> : null}
              </choice>
            </repeat>
            {config.enableOpenApplications ? [
              <list items={[' in ', ' using ', ' with ']} limit={1} id='openin' value />,
              <repeat unique id='apps' separator={<list items={[' and ', ', and ', ', ']} limit={1} />}>
                <Application suppressEmpty={false} />
              </repeat>
            ] : null}
          </sequence>
          <sequence>
            <literal text='reveal ' id='verb' value='reveal' />
            <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />} unique>
              <choice>
                {config.enableRevealApplications ? <Application /> : null}
                {config.enableRevealVolumes ? <MountedVolume /> : null}
                {config.enableRevealDirectories ? <Directory splitOn={/\s|,/} /> : null}
                {config.enableRevealFiles ? <File splitOn={/\s|,/} /> : null}
              </choice>
            </repeat>
            <literal text=' in ' />
            <literal text='Finder'
              argument='application'
              annotation={{type: 'icon', path: '/System/Library/CoreServices/Finder.app'}} />
          </sequence>
          {config.enableDelete ? (
            <sequence>
              <list items={['delete ', 'trash ']} id='verb' value='delete' />
              <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />} ellipsis unique>
                <choice>
                  <Directory splitOn={/\s|,/} />
                  <File splitOn={/\s|,/} />
                </choice>
              </repeat>
            </sequence>
          ) : null}
          <sequence>
            <list id='verb' items={[
              config.enableMove ? {text: 'move ', value: 'move'} : null,
              config.enableCopy ? {text: 'copy ', value: 'duplicate'} : null
            ]} />
            <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />} unique >
              <choice>
                <Directory splitOn={/\s|,/} />
                <File splitOn={/\s|,/} />
              </choice>
            </repeat>
            <literal text=' to ' />
            <choice merge>
              <Directory id='dest' />
              <placeholder argument='trash' id='verb' value='delete'>
                <literal text='Trash' />
              </placeholder>
            </choice>
          </sequence>
          {config.enableActivate ? (
            <sequence>
              <list items={['switch to ', 'activate ']} id='verb' value='switch' />
              <choice id='item'>
                <RunningApplication suppressEmpty={false} />
                <ContentArea />
              </choice>
            </sequence>
          ) : null}
          {config.enableRelaunch ? (
            <sequence>
              <literal text='relaunch ' id='verb' value='relaunch' />
              <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />}>
                <RunningApplication suppressEmpty={false} />
              </repeat>
            </sequence>
          ) : null}
          {config.enableQuit ? (
            <sequence>
              <list items={['quit ', 'kill ']} id='verb' value='quit' />
              <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />}>
                <RunningApplication suppressEmpty={false} />
              </repeat>
            </sequence>
          ) : null}
          {config.enableHide ? (
            <sequence>
              <list items={['hide ']} id='verb' value='hide' />
              <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />}>
                <RunningApplication suppressEmpty={false} />
              </repeat>
            </sequence>
          ) : null}
          {config.enableClose ? (
            <sequence>
              <literal text='close ' id='verb' value='close' />
              <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} />}>
                <choice>
                  <RunningApplication suppressEmpty={false} />
                  <ContentArea />
                </choice>
              </repeat>
            </sequence>
          ) : null}
          {config.enableEject ? (
            <sequence>
              <list items={['eject ', 'unmount ', 'dismount ']} id='verb' value='eject' />
              <choice merge>
                <list items={['all', 'everything', 'all devices', 'all drives', 'all volumes']} limit={1} id='verb' value='eject-all' />
                <repeat id='items' separator={<list items={[', ', ', and ', ' and ']} limit={1} />} unique>
                  <MountedVolume suppressEmpty={false} />
                </repeat>
              </choice>
            </sequence>
          ) : null}
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
