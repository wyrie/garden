const supertest = require("supertest")
const { app } = require("../app")

describe('GET /hello', () => {
  const agent = supertest.agent(app)

  it('should include populated usernames in the response', (done) => {
    agent
      .get("/hello")
      .expect(200, { message: "Hello from Node! Usernames: John, Paul, George, Ringo" })
      .end((err) => {
        if (err) return done(err)
        done()
      })
  })
})

