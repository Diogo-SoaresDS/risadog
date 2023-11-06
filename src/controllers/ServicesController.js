const knex = require('../database')

module.exports = {
    async index(req, res, next) {
        try {
            const results = await knex('servicos').select('idServicos', 'nome', 'preco_p', 'preco_m', 'preco_g')
            return res.json(results)
        } catch(error){
            next(error)            
        }
    }
}