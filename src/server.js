const express = require('express')
const routes = require('./routes')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())
app.use(routes)

app.use('/teste', (req, res, next) => {
    res.send('Esse é um teste')
})

app.use((req, res, next) => {
    const error = new Error('Not Found')
    error.status = 404
    next(error)
})

app.use((error, req, res, next) => {
    res.status(error.status || 500)
    res.json({error: error.message})
})

app.listen(process.env.PORT || 3001, () => console.log('Server in running'))