var request = require('request');
var options = {
  'method': 'GET',
  'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/4708/FUT?strategy=DEFAULT&tradeDate=05/19/2025&pageSize=500&isProtected&_t=1747732336411',
  'headers': {
    'accept': 'application/json',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6',
    //'Cookie': 'ak_bmsc=6EEB2C57B39D42B1EECA1B36B3590768~000000000000000000000000000000~YAAQFVUQYAYsqMuWAQAABwkC7RvflG+C5GCjonTv0JSpmJvCm45a5w1haVw8FkKiB3NDIXrm4g6GoU6oGd931wluXpY6Nj8qH4e2Uy8m+qHH6LuSAy8W9AhUoqvYHEaVDiu+GU2NH6t+CXjyvG9L9j5r1gXfSNLfBth6eR/0EWrnNfn3RPKABW9w5kKZeHTjKYn3r8l5vm6dqSrqInbGjdl9+DgqhmWIndbYYhk+zDYCwlqerIukS/Ft7lKs+MisYsmMNIOawUR9nRPW5Zn7D0BzPWB9iuwUbYhCVwlcR4Huel3pYpuGrdB+ftURnePj73fLV0IdchU3o0mHjBIvlZ8/AFF4hJVHgkkERo+T; bm_sv=4DC7954B6FC21604D31964EE670949CF~YAAQFVUQYIeoqMuWAQAAqr4D7RupIJokvukccmYoOieofK8hRCTJwDvy8mCAO6mqRy8dfAzkV+23JxaKk3m8Xx43fGm9VVoaC1EqmqZu57/YsRylr4Xj71791DCSVmF3s+q1Snq8Cb47QCFateNQ6ql3hRPj8CqkROmDo8tsb4OIqCBfWWk1MfX4YslyanUDfB1xlmV6w5/ICxTfwwxaytwu6o105cGiO8zE0WI6+nSE6zP6dBvdC2IHJlce2uCA3mo=~1'
  }
};
request(options, function (error, response) {
    //var responseBody = JSON.parse(response.getBody('utf8'));
    //var responseBody = JSON.parse(response.body);
    var responseBody = response.body;
    //console.log(JSON.parse(responseBody));
    console.log(responseBody);
    if (error) throw new Error(error);
        console.log(response.body);
});
