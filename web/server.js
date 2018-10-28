'use strict';

const express = require('express');
const { Pool } = require('pg');

const pool = new Pool();
const query = pool.query.bind(pool);

const app = express();

const singleQuery = (userId, next) => {
  query(`
    UPDATE users
    SET ("lastSeen", "lastLastSeen") = (NOW(), "lastSeen")
    WHERE id = $1
    RETURNING "lastSeen" - "lastLastSeen" as "timeDelta";
  `, [userId])
    .then(res => next(null, res.rows[0].timeDelta))
    .catch(next);
};

// Helper function. Batches calls to `fn` every `ms` milliseconds.
const batch = (ms, fn) => {
  let pendingRequests = [];

  setInterval(() => {
    if (pendingRequests.length) {
      const requests = pendingRequests;
      pendingRequests = [];
      fn(requests);
    }
  }, ms);

  return (args) => { pendingRequests.push(args); };
};

const multipleQuery = batch(10, (args) => {
  // Args looks like [{ userId, next }]
  const userIds = args.map(({ userId }) => userId);
  const nexts = {};
  args.forEach(({ userId, next }) => { nexts[userId] = next; });

  query(`
    UPDATE users
    SET ("lastSeen", "lastLastSeen") = (NOW(), "lastSeen")
    WHERE id = ANY($1)
    RETURNING id, "lastSeen" - "lastLastSeen" as "timeDelta";
  `, [userIds])
    .then((res) => {
      res.rows.forEach(({ id, timeDelta }) => {
        nexts[id](null, timeDelta);
      });
    })
    .catch((err) => {
      userIds.forEach((id) => { nexts[id](err); });
    });
});

// Common endpoint logic.
const greet = (response, error, timeDelta) => {
  if (error) {
    response.status(500).send(JSON.stringify(error));
  } else if (timeDelta == null) {
    response.send('Welcome!');
  } else {
    response.send('Welcome back!');
  }
};

const randomUser = () => Math.round(Math.random() * 1e6);

app.get('/single/:userId?', (req, res) => {
  let { userId } = req.params;
  if (userId == null) userId = randomUser();
  singleQuery(userId, (err, delta) => greet(res, err, delta));
});

app.get('/multiple/:userId?', (req, res) => {
  let { userId } = req.params;
  if (userId == null) userId = randomUser();
  multipleQuery({ userId, next: (err, delta) => greet(res, err, delta) });
});

app.listen(3000);
