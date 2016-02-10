/** @jsx createElement */

import _ from 'lodash'
import { createElement, Phrase } from 'lacona-phrase'
import { URL } from 'lacona-phrase-url'
import { File } from 'lacona-phrase-file'
import { Command } from 'lacona-command'
import { Application, PreferencePane, RunningApplication, ContentArea, MountedVolume } from 'lacona-phrase-system'
import { openURL, openFile, unmountAllVolumes } from 'lacona-api'

function andify (array, separator = ', ') {
  if (array.length === 1) {
    return array
  } else if (array.length === 2) {
    return [array[0], {text: ' and '}, array[1]]
  } else {
    return _.chain(array)
      .slice(0, -2)
      .map(item => [item, {text: separator}])
      .flatten()
      .concat(_.slice(array, -2, -1)[0])
      .concat({text: `${separator}and `})
      .concat(_.slice(array, -1)[0])
      .value()
  }
}

function colorizeOpen (obj) {
  if (obj.name) {
    return {text: obj.name, argument: obj.type}
  } else if (obj.url) {
    return {text: obj.url, argument: 'url'}
  } else if (obj.path) {
    return {text: obj.path, argument: 'path'}
  }
}

function outputify (objs) {
  const outputs = _.map(objs, colorizeOpen)
  return andify(outputs)
}

function outputifyOpen (objs) {
  const groups = _.groupBy(objs, obj => obj.type || Object.keys(obj)[0])
  const message = []

  if (groups.application) {
    message.push(_.flatten([{text: 'launch ', category: 'action'}, outputify(groups.application)]))
  }
  if (groups.url) {
    message.push(_.flatten([{text: 'load ', category: 'action'}, outputify(groups.url), {text: ' in '}, {text: 'the default browser', argument: 'application'}]))
  }
  if (groups.path) {
    message.push(_.flatten([{text: 'open ', category: 'action'}, outputify(groups.path), {text: ' in '}, {text: 'the default application', argument: 'application'}]))
  }
  if (groups['preference-pane']) {
    message.push(_.flatten([{text: 'open ', category: 'action'}, {text: ' the '}, outputify(groups['preference-pane']), {text: ' system preference pane'}]))
  }

  return _.flatten(andify(message, '; '))
}


class CommandObject {
  constructor (result) {
    this.result = result
  }

  _demoExecute () {
    if (this.result.verb === 'open') {
      if (this.result.apps) {
        return _.flatten([
          {text: 'open ', category: 'action'},
          outputify(this.result.items),
          {text: ' in '},
          outputify(this.result.apps),
        ])
      } else {
        return outputifyOpen(this.result.items)
      }
    } else if (this.result.verb === 'switch') {
      return _.flatten([
        {text: 'switch focus to ', category: 'action'},
        colorizeOpen(this.result.item)
      ])
    } else if (this.result.verb === 'close') {
      return _.flatten([
        {text: 'close every window of ', category: 'action'},
        outputify(this.result.items)
      ])
    } else if (this.result.verb === 'quit') {
      return _.flatten([
        {text: 'quit ', category: 'action'},
        outputify(this.result.items)
      ])
    } else if (this.result.verb === 'kill') {
      return _.flatten([
        {text: 'kill all ', category: 'action'},
        outputify(this.result.items),
        {text: ' processes'}
      ])
    } else if (this.result.verb === 'eject') {
      return _.flatten([
        {text: 'eject ', category: 'action'},
        outputify(this.result.items)
      ])
    }
  }

  execute () {
    if (this.result.verb === 'open') {
      this.result.items.forEach(item => {
        if (this.result.apps) {
          this.result.apps.forEach(app => {
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
    } else if (this.result.verb === 'switch') {
      if (this.result.item.activate) this.result.item.activate()
    } else if (this.result.verb === 'quit') {
      _.forEach(this.result.items, item => {
        if (item.quit) item.quit()
      })
    } else if (this.result.verb === 'close') {
      _.forEach(this.result.items, item => {
        if (item.close) item.close()
      })
    } else if (this.result.verb === 'hide') {
      _.forEach(this.result.items, item => {
        if (item.hide) item.hide()
      })
    } else if (this.result.verb === 'eject') {
      _.forEach(this.result.items, item => {
        if (item.eject) item.eject()
      })
    } else if (this.result.verb === 'eject-all') {
      unmountAllVolumes()
    }
  }
}

export class Open extends Phrase {
  static extends = [Command]

  validate (result) {
    if (result.verb === 'eject' && _.some(result.items, item => !item.canEject())) {
      return false
    }
    return true
  }
  
  // TODO add canOpen, canEject, ... support
  describe () {
    return (
      <map function={result => new CommandObject(result)}>
        <choice>
          <sequence>
            <literal text='open ' category='action' id='verb' value='open' />
            <repeat id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />}>
              <choice>
                <Application score={1} />
                <PreferencePane score={1} />
                <MountedVolume />
              </choice>
            </repeat>
          </sequence>
          <sequence>
            <literal text='open ' category='action' id='verb' value='open' />
            <repeat unique id='items' separator={<list items={[' and ', ', and ', ', ']} limit={1} category='conjunction' />} ellipsis>
              <choice>
                <URL splitOn={/\s|,/} id='url' />
                <File id='path' />
              </choice>
            </repeat>
            <list items={[' in ', ' using ', ' with ']} limit={1} category='conjunction' />
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
      </map>
    )
  }
}

export const extensions = [Open]
