const knex = require('knex')

module.exports = {
    async index(req, res, next) {
        try {
            const results = await knex('servicos').select('servicos.nome')
            return res.json(results)
        } catch(error){
            next(error)
        }
    },
}