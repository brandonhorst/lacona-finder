/** @jsx createElement */

import _ from 'lodash'
import {createElement, Phrase} from 'lacona-phrase'
import Application from 'lacona-phrase-application'
import PreferencePane from 'lacona-phrase-preference-pane'
import URL from 'lacona-phrase-url'
import File from 'lacona-phrase-file'
import {RunningApplication, BrowserTab, OpenWindow} from 'lacona-phrase-system-state'

export function execute (result) {
  if (result.verb === 'open') {
    result.items.forEach(item => {
      if (item.open) {
        item.open()
      } else if (item.url) {
        global.openURL(item.url)
      } else if (item.path || item.pref) {
        global.openFile(item.path || item.pref)
      }
    })
  } else if (result.verb === 'openin') {
    result.items.forEach(item => {
      result.apps.forEach(app => {
        if (item.url) {
          app.openURL(item.url)
        } else if (item.path) {
          app.openFile(item.path)
        }
      })
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
              <Application />
              <PreferencePane id='pref' />
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
            <RunningApplication />
            <OpenWindow />
            <BrowserTab />
          </choice>
        </sequence>
        <sequence>
          <list items={['quit ', 'kill ']} category='action' id='verb' value='quit' />
          <repeat unique={true} id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
            <RunningApplication />
          </repeat>
        </sequence>
        <sequence>
          <list items={['hide ']} category='action' id='verb' value='hide' />
          <repeat unique={true} id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
            <RunningApplication />
          </repeat>
        </sequence>
        <sequence>
          <literal text='close ' category='action' id='verb' value='close' />
          <repeat unique={true} id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
            <choice>
              <RunningApplication />
              <OpenWindow />
              <BrowserTab />
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
