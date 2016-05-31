/** @jsx createElement */

import { createElement } from 'elliptical'
import { Application, PreferencePane, RunningApplication, ContentArea, MountedVolume, File, Directory, ContactCard, URL, Command } from 'lacona-phrases'
import { openURL, openFile, unmountAllVolumes } from 'lacona-api'

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
    } else if (result.verb === 'switch') {
      if (result.item.activate) result.item.activate()
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
              <Application />
            </repeat>
          </sequence>
          <sequence>
            <literal text='switch to ' category='action' id='verb' value='switch' />
            <choice id='item'>
              <RunningApplication />
              <ContentArea />
            </choice>
          </sequence>
          <sequence>
            <list items={['quit ', 'kill ']} category='action' id='verb' value='quit' />
            <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
              <RunningApplication />
            </repeat>
          </sequence>
          <sequence>
            <list items={['hide ']} category='action' id='verb' value='hide' />
            <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
              <RunningApplication />
            </repeat>
          </sequence>
          <sequence>
            <literal text='close ' category='action' id='verb' value='close' />
            <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
              <choice>
                <RunningApplication />
                <ContentArea />
              </choice>
            </repeat>
          </sequence>
          <sequence>
            <list items={['eject ', 'unmount ', 'dismount ']} category='action' id='verb' value='eject' />
            <choice merge>
              <list items={['all', 'everything', 'all devices']} limit={1} category='action' id='verb' value='eject-all' />
              <repeat id='items' separator={<list items={[', ', ', and ', ' and ']} limit={1} />}>
                <MountedVolume />
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
      _.some(result.items, item => !item.eject)) {
    return false
  }


  if (result.verb === 'switch' && result.item && !result.item.activate) {
    return false
  }

  if (result.verb === 'hide' &&
      _.some(result.items, item => !item.hide)) {
    return false
  }

  if (result.verb === 'close' &&
      _.some(result.items, item => !item.close)) {
    return false
  }

  if (result.verb === 'open') {
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
