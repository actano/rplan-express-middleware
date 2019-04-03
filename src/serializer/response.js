import pick from 'lodash/fp/pick'

const responseSerializer = pick([
  'statusCode',
])

export {
  responseSerializer,
}
