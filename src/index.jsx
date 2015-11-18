/** @jsx createElement */

import {createElement, Phrase} from 'lacona-phrase'
// import open from 'open'
import Application from 'lacona-phrase-application'
import PreferencePane from 'lacona-phrase-preference-pane'
import URL from 'lacona-phrase-url'
import File from 'lacona-phrase-file'
import {RunningApplication, BrowserTab, OpenWindow} from 'lacona-phrase-system-state'


function tabCloseApplescript (value) {
  if (value.app === 'Google Chrome') {
    return `
      tell application "Google Chrome"
      	repeat with wi from 1 to count windows
      		repeat with ti from 1 to count (window wi's tabs)
      			if id of window wi's tab ti is ${value.id} then
              close window wi's tab ti
              return
      			end if
      		end repeat
      	end repeat
      end tell
    `
  } else if (value.app === 'Safari') {
    const [winId, tabId] = value.id.split('-')
    //TODO THIS DOES NOT WORK
    return `
      tell application "Safari"
      	close window ${winId}'s tab ${tabId}
      end tell
    `
  }

}

export function execute (result) {
  if (result.verb === 'open') {
    result.items.forEach(item => {
      if (item.url) {
        global.openURL(item.url)
      } else if (item.bundleId) {
        global.launchApp(item.bundleId)
      } else if (item.path) {
        global.openFile(item.path)
      }
    })
  } else if (result.verb === 'openin') {
    result.items.forEach(item => {
      result.apps.forEach(app => {
        if (item.url) {
          global.openURLInApp(item.url, app)
        } else if (item.path) {
          global.openFileInApp(item.path, app)
        }
      })
    })
  } else if (result.verb === 'switch') {
      if (result.item.bundleId) {
        global.launchApp(result.item.bundleId)
      } else if (result.item.tabId) {
        const script = tabSwitchApplescript(item.tabId)
        global.applescript(script)
      } else if (result.item.windowId) {

      }

  } else if (result.verb === 'quit') {
    result.bundleIds.forEach(bundleId => {
      global.quitApplication(bundleId, err => {
        if (err) {
          console.error(err)
        }
      })
    })
  } else if (result.verb === 'close') {
    result.items.forEach(item => {
      if (item.bundleId) {
        global.launchApp(result.item.bundleId)
      } else if (item.tabId) {

        const script = tabCloseApplescript(result.item.tabId)
        global.applescript(script)
      }
    })
  }
}

export class Sentence extends Phrase {
  describe () {
    return (
      <choice>
        <sequence>
          <literal text='open ' category='action' id='verb' value='open' />
          <repeat unique={true} id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
            <choice>
              <Application id='bundleId' />
              <PreferencePane id='path' />
              <URL splitOn={/\s|,/} id='url' />
              <File id='path' />
            </choice>
          </repeat>
        </sequence>
        <sequence>
          <literal text='open ' category='action' id='verb' value='openin' />
          <repeat unique={true} id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
            <choice>
              <URL splitOn={/\s|,/} id='url' />
              <File id='path' />
            </choice>
          </repeat>
          <list items={[' in ', ' using ', ' with ']} limit={1} category='conjunction' />
          <repeat unique={true} id='apps' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
            <Application />
          </repeat>
        </sequence>
        <sequence>
          <literal text='switch to ' category='action' id='verb' value='switch' />
          <choice id='item'>
            <RunningApplication id='bundleId' />
            <OpenWindow id='windowId' />
            <BrowserTab id='tabId' />
          </choice>
        </sequence>
        <sequence>
          <list items={['quit ', 'kill ']} category='action' id='verb' value='quit' />
          <repeat unique={true} id='bundleIds' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
            <RunningApplication />
          </repeat>
        </sequence>
        <sequence>
          <literal text='close ' category='action' id='verb' value='close' />
          <repeat unique={true} id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
            <choice>
              <RunningApplication id='bundleId' />
              <OpenWindow id='windowId' />
              <BrowserTab id='tabId' />
            </choice>
          </repeat>
        </sequence>
      </choice>
    )
  }
}

export default {
  sentences: [
    {Sentence, execute}
  ]
}
