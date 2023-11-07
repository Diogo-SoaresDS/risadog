const knex = require('../database')

module.exports = {
    async create(req, res, next) {
        try {
            const { animais } = req.body
            const { idCliente } = req.params
    
            if (!idCliente) {
                return res.status(400).json({ error: 'ID do cliente ausente.' });
            }
    
            const idsAnimais = []
            for (const animal of animais) {
                const { idAnimal, nome, especie, raca, genero, rga, obs } = animal
    
                const novoAnimal = {
                    idAnimal,
                    nome,
                    especie,
                    raca,
                    genero,
                    rga,
                    obs,
                    status: 'Ativo'
                }

                await knex('animais').insert(novoAnimal)
                await knex('propriedades').insert({
                    idCliente,
                    idAnimal
                })
    
                idsAnimais.push(idAnimal)
            }
    
            return res.status(201).json({ message: 'Animais criados com sucesso'})
        } catch (error) {
            next(error)
        }
    },

    async update(req, res, next) {
        const { nome, especie, raca, genero, rga, obs, status } = req.body
        const { idAnimal } = req.params

        try{
            await knex('animais').update({
                nome,
                especie,
                raca,
                genero,
                rga,
                obs,
                status
            }).where({ idAnimal })

            return res.send({ message: 'Animal atualizado com sucesso' })
        } catch (error) {
            next(error)
        }
    },

    async delete(req, res, next) {
        const { idAnimal } = req.params
        
        try {
            const animalExiste = await knex('animais').where({ idAnimal }).first()

            if(!animalExiste)
                return res.status(404).json({ error: 'Animal não encontrado' })
            
            const idSolicitacoes = await knex('solicitacoes_de_servicos')
                .select('idSolicitacao')
                .where({ idAnimal })
          
            if (idSolicitacoes.length > 0) {
                const idsSolicitacoes = idSolicitacoes.map((solicitacao) => solicitacao.idSolicitacao)
            
                await knex('execucoes').whereIn('idItemSolicitacao', function() {
                    this.select('idItemSolicitacao').from('item_solicitacao').whereIn('idSolicitacao', idsSolicitacoes);
                }).del()
            
                await knex('item_solicitacao').whereIn('idSolicitacao', idsSolicitacoes).del()
            }
        
            await knex('solicitacoes_de_servicos').where({ idAnimal }).del()
            await knex('propriedades').where({ idAnimal }).del()
            await knex('animais').where({ idAnimal }).del()
            return res.send()
        } catch(error) {
            next(error)
        }
    },

    async listAgender(req, res, next) {
        try {
            const { id } = req.params
            const agendamentos = await knex('solicitacoes_de_servicos')
                .where({ idAnimal: id })

            res.json(agendamentos)
        } catch(error){
            next(error)
        }
    }
}