const express = require('express')
const bodyParser = require('body-parser')
const { ApiException, ApiResponse, sleep } = require('./utils')

const app = express()
const BAD_REQUEST = 10400
const UNAUTHORIZED = 10401
const SERVER_ERROR = 10500

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
)

const router = express.Router()

router.use(async (req, res, next) => {
  await sleep(500)
  next()
})

router.get('/', (req, res) => {
  res.json('welcome')
})

router.get('/data', (req, res) => {
  res.json(ApiResponse.success({ username: '用户名', nickname: '昵称' }))
})

router.get('/error', (req, res) => {
  throw new ApiException(BAD_REQUEST, '商品不存在')
})

router.get('/product', (req, res) => {
  const query = req.query || {}
  const { page_num } = query
  if (page_num == null) {
    throw new ApiException(BAD_REQUEST, '页码不能为空')
  }
  const list = [{ name: 'name1' }, { name: 'name2' }]
  return res.json(
    ApiResponse.success({ list: list, page_num, page_size: 2, total: 40 }),
  )
})

router.post('/login', (req, res) => {
  const body = req.body || {}
  const { username, password } = body
  if (username == password) {
    return res.json(ApiResponse.success({ access_token: 'fake token' }))
  }
  throw new ApiException(BAD_REQUEST, '密码错误')
})

router.get('/sleep', async (req, res) => {
  const { query = {} } = req
  let { timeout = 200 } = query
  timeout = timeout >= 0 ? timeout : 0
  await sleep(timeout)

  return res.json(ApiResponse.success(null, `睡眠时间 + ${timeout}ms`))
})

let count = 0
router.get('/retry', (req, res) => {
  if (++count % 3 == 0) {
    count = 0
    return res.json(ApiResponse.success())
  }
  throw new ApiException(
    SERVER_ERROR,
    `服务器异常（当前计数为：${count}，下一次请求会${
      count % 3 == 0 ? '**成功**' : '**失败**'
    }）`,
  )
})

router.get('/secret', (req, res) => {
  const auth = req.headers.authorization
  if (auth != `Bearer fake token`)
    throw new ApiException(UNAUTHORIZED, '未授权')

  res.json(
    ApiResponse.success({
      account: '10001',
      password: '******',
    }),
  )
})

router.use((err, req, res, next) => {
  if (err instanceof ApiException == false) {
    err = new ApiException(10000, err.message || '未知错误')
  }
  return res.status(200).json(ApiResponse.error(err))
})

app.use('/api', router)
app.all('*', (req, res) => {
  res.status(200).json(new ApiResponse(10404, null, '接口不存在'))
})

app.listen(3000, () => {
  console.log('server is listen on http://localhost:3000')
})
