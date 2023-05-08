module.exports = function(app, db) {
    app.post('/', (req, res) => {
      console.log(req.body)
      res.send('Hello')
    });
  };