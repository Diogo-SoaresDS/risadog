const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization
    if(!authHeader){
        return res.status(401).send({ error: 'Token não foi informado.' })
    }

    const parts = authHeader.split(' ')
    if(!parts.lenght === 2){
        return res.status(401).send({ error: 'Token error' })
    }

    const [ scheme, token ] = parts
    if(!/^Bearer$/i.test(scheme)){
        return res.status(401).send({ error: 'Token malformado.' })
    }

    jwt.verify(token, process.env.SECRET, (erro, decoded) => {
        if(erro) return res.status(401).send({ error: 'Token inválido' })
        req.idColaborador = decoded.idColaborador
        return next()
    })
}