/** @jsx createElement */

import {createElement, Phrase, Source} from 'lacona-phrase'
import open from 'open'
import path from 'path'
import {exec} from 'child_process'
import Spotlight from 'LaconaSource-Spotlight'

// class Spotlight extends Phrase {
//
//   static get initialState() {return {files: []}}
//
//   compute(input) {
//     if (input !== '' && !this.state.files[input]) {
//       const args = ['-onlyin', this.props.dir, this.props.query]
//       const opts = {stdout: 'pipe'}
//       const child = spawn('mdfind', args, opts)
//       var rl = readline.createInterface({
//         input: child.stdout,
//       })
//       rl.on('line', line => {
//         const files = this.state.files[input] || []
//         const file = path.basename(line, '.app')
//         this.setState({files: {[input]: files.concat(file)}})
//       })
//     }
//
//     const files = this.state.files[input] || []
//     return files.map(file => ({text: file, value: file}))
//   }
//
//   describe() {
//     return <value compute={this.compute.bind(this)} limit={10} />
//   }
// }
//
class AppSource extends Source {
  create() {
    this.replaceData([])
    setInterval(this.updateCache.bind(this), 60 * 1000)
    this.updateCache()
  }

  updateCache() {
    const child = exec(`mdfind -onlyin /Applications kind:application`, (err, stdout) => {
      const resultString = stdout.toString('utf8')
      const appPaths = resultString.split('\n').filter(str => str !== '')
      const apps = appPaths.map(appPath => ({path: appPath, name: path.basename(appPath, '.app')}))
      this.replaceData(apps)
    })
  }
}

class Application extends Phrase {
  source() {
    return {apps: <Spotlight directories={['/Applications']} query='kind:application' attributes={['kMDItemDisplayName']}/>}
  }

  describe() {
    const apps = this.apps.map(app => ({text: app.kMDItemDisplayName, value: app.path}))

    return <list fuzzy='true' items={apps} />
  }
}

class OpenApp extends Phrase {
  execute () {
    open(result.path)
  }

  describe() {
    return (
      <sequence>
        <literal text='open ' category='action' />
        <placeholder text='app' id='path' category='actor'>
          <Application />
        </placeholder>
      </sequence>
    )
  }
}


export default {
  sentences: [OpenApp],
  translations: [{
    langs: ['en', 'default'],
    information: {
      title: 'Open Application',
      description: 'Quickly launch applications on your computer',
      examples: ['open Safari', 'open Contacts']
    }
  }]
}
