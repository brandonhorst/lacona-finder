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

export default function demoExecute (result) {
  if (result.verb === 'open') {
    if (result.apps) {
      return _.flatten([
        {text: 'open ', category: 'action'},
        outputify(result.items),
        {text: ' in '},
        outputify(result.apps),
      ])
    } else {
      return outputifyOpen(result.items)
    }
  } else if (result.verb === 'switch') {
    return _.flatten([
      {text: 'switch focus to ', category: 'action'},
      colorizeOpen(result.item)
    ])
  } else if (result.verb === 'close') {
    return _.flatten([
      {text: 'close every window of ', category: 'action'},
      outputify(result.items)
    ])
  } else if (result.verb === 'quit') {
    return _.flatten([
      {text: 'quit ', category: 'action'},
      outputify(result.items)
    ])
  } else if (result.verb === 'kill') {
    return _.flatten([
      {text: 'kill all ', category: 'action'},
      outputify(result.items),
      {text: ' processes'}
    ])
  } else if (result.verb === 'eject') {
    return _.flatten([
      {text: 'eject ', category: 'action'},
      outputify(result.items)
    ])
  }
}
