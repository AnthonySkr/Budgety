import supertest from 'supertest'
import { createApp } from './app.js'

const app = createApp()
const request = supertest(app)

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request.get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok' })
  })
})
