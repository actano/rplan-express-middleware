import flow from 'lodash/fp/flow'
import omit from 'lodash/fp/omit'
import pick from 'lodash/fp/pick'
import update from 'lodash/fp/update'
import toString from 'lodash/toString'

const REQUEST_PROPERTY_WHITELIST = [
  'borderContext',
  'user',
  'headers',
  'hostname',
  'id',
  'ip',
  'method',
  'originalUrl',
  'protocol',
  'query',
  'route.path',
  'url',
  'xhr',
]

const requestSerializer = flow(
  pick(REQUEST_PROPERTY_WHITELIST),
  update('headers', omit([
    'authorization',
    'cookie',
    'host',
  ])),
  // `route.path` may be a RegEx which may cause trouble when parsing the log message. So we always
  // convert it to a string.
  update(
    'route.path',
    toString,
  ),
)

export {
  requestSerializer,
}
