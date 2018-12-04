/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeTestGardenA } from "../../helpers"
import { startServer } from "../../../src/server/server"
import { Server } from "http"
import { Garden } from "../../../src/garden"
import { expect } from "chai"
import { deepOmitUndefined } from "../../../src/util/util"
import * as uuid from "uuid"
import request = require("supertest")
import getPort = require("get-port")
import WebSocket = require("ws")

describe("startServer", () => {
  let garden: Garden
  let server: Server
  let port: number

  before(async () => {
    port = await getPort()
    garden = await makeTestGardenA()
    server = await startServer(garden, garden.log, port)
  })

  after(async () => {
    server.close()
  })

  describe("GET /", () => {
    // TODO: test dashboard endpoint
  })

  describe("POST /api", () => {
    it("should 400 on non-JSON body", async () => {
      await request(server).post("/api").send("foo").expect(400)
    })

    it("should 400 on invalid payload", async () => {
      await request(server).post("/api").send({ foo: "bar" }).expect(400)
    })

    it("should 404 on invalid command", async () => {
      await request(server).post("/api").send({ command: "foo" }).expect(404)
    })

    it("should execute a command and return its results", async () => {
      const res = await request(server).post("/api").send({ command: "get.config" }).expect(200)
      const config = await garden.dumpConfig()
      expect(res.body.result).to.eql(deepOmitUndefined(config))
    })

    it("should correctly map arguments and options to commands", async () => {
      const res = await request(server).post("/api").send({
        command: "build",
        parameters: {
          modules: ["module-a"],
          force: true,
        },
      }).expect(200)

      expect(res.body.result).to.eql({
        "build.module-a": {
          dependencyResults: {},
          description: "building module-a",
          output: {
            buildLog: "A",
            fresh: true,
          },
          type: "build",
        },
      })
    })
  })

  describe("/ws", () => {
    let ws: WebSocket

    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${port}/ws`)
      ws.on("open", () => {
        done()
      })
      ws.on("error", done)
    })

    afterEach(() => {
      ws.close()
    })

    const onMessage = (cb: (req: object) => void) => {
      ws.on("message", msg => cb(JSON.parse(msg.toString())))
    }

    it("should emit events from the event bus", (done) => {
      onMessage((req) => {
        expect(req).to.eql({ type: "event", name: "_test", payload: "foo" })
        done()
      })
      garden.events.emit("_test", "foo")
    })

    it("should send error when a request is not valid JSON", (done) => {
      onMessage((req) => {
        expect(req).to.eql({ type: "error", message: "Could not parse message as JSON" })
        done()
      })
      ws.send("ijdgkasdghlasdkghals")
    })

    it("should error when a request is missing an ID", (done) => {
      onMessage((req) => {
        expect(req).to.eql({ type: "error", message: "Message should contain an `id` field with a UUID value" })
        done()
      })
      ws.send(JSON.stringify({ type: "command" }))
    })

    it("should error when a request has an invalid ID", (done) => {
      onMessage((req) => {
        expect(req).to.eql({ type: "error", message: "Message should contain an `id` field with a UUID value" })
        done()
      })
      ws.send(JSON.stringify({ type: "command", id: "ksdhgalsdkjghalsjkg" }))
    })

    it("should error when a request has an invalid type", (done) => {
      const id = uuid.v4()
      onMessage((req) => {
        expect(req).to.eql({
          type: "error",
          requestId: id,
          message: "Unsupported request type: foo",
        })
        done()
      })
      ws.send(JSON.stringify({ type: "foo", id }))
    })

    it("should execute a command and return its results", (done) => {
      const id = uuid.v4()

      garden.dumpConfig()
        .then(config => {
          onMessage((req) => {
            expect(req).to.eql({
              type: "commandResult",
              requestId: id,
              result: deepOmitUndefined(config),
            })
            done()
          })
          ws.send(JSON.stringify({
            type: "command",
            id,
            command: "get.config",
          }))
        })
        .catch(done)
    })

    it("should correctly map arguments and options to commands", (done) => {
      const id = uuid.v4()
      onMessage((req) => {
        expect(req).to.eql({
          type: "commandResult",
          requestId: id,
          result: {
            "build.module-a": {
              dependencyResults: {},
              description: "building module-a",
              output: {
                buildLog: "A",
                fresh: true,
              },
              type: "build",
            },
          },
        })
        done()
      })
      ws.send(JSON.stringify({
        type: "command",
        id,
        command: "build",
        parameters: {
          modules: ["module-a"],
          force: true,
        },
      }))
    })
  })
})
