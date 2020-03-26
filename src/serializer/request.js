import flow from 'lodash/fp/flow'
import omit from 'lodash/fp/omit'
import pick from 'lodash/fp/pick'
import update from 'lodash/fp/update'


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
)

export {
  requestSerializer,
}
