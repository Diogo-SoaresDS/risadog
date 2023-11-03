const knex = require('../database')

module.exports = {
    async resumoPag(req, res, next){
        try {
            const { id } = req.params

            const pagamentoInfo = await knex('execucoes')
                
                
            
        } catch(error){
            next(error)
        }
    }
}