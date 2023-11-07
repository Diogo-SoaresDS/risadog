const knex = require('../database')

module.exports = {
    async index(req, res, next) {
        try {
            const results = await knex('solicitacoes_de_servicos')
            return res.json(results)
        } catch(error){
            next(error)            
        }
    },

    async create(req, res, next) {
        try {
            const { idCliente, idAnimal, idEspecialidade, inicio, termino, duracao, obs, avalicao, feedback, status, preco } = req.body

            const { servicos } = req.query
            if (!servicos || !Array.isArray(servicos)) {
                return res.status(400).json({ error: 'Serviço ausente ou formato incorreto.' })
            }

            const novaSolicitacao = {
                idCliente, 
                idAnimal, 
                idEspecialidade, 
                inicio, 
                termino,
                duracao, 
                avalicao,
                obs,  
                feedback, 
                status, 
                preco
            }
            const servicosExistentes = await knex('servicos')
                .whereIn('nome', servicos)

            if (servicosExistentes.length !== servicos.length) {
                return res.status(400).json({ error: 'Um ou mais serviços não foram encontrados.' })
            }

            for (const servico of servicosExistentes) {
                const [idSolicitacao] = await knex('solicitacoes_de_servicos')
                    .insert(novaSolicitacao)

                await knex('item_solicitacao').insert({
                    idSolicitacao,
                    idServicos: servico.idServicos
                })
            }

            return res.status(201).send()
        } catch (error) {
            next(error)
        }
    },

    async update(req, res, next) {
        const { idCliente, idAnimal, idEspecialidade, inicio, termino, duracao, obs, avalicao, feedback, status, preco } = req.body
        const { id } = req.params

        try{
            await knex('solicitacoes_de_servicos').update({
                idCliente, 
                idAnimal, 
                idEspecialidade, 
                inicio, 
                termino,
                duracao, 
                avalicao,
                obs,  
                feedback, 
                status, 
                preco
            }).where({ idSolicitacao: id })

            return res.send()
        } catch (error) {
            next(error)
        }
    },

    async delete(req, res, next) {
        try{
            const { id } = req.params

            const solicitacaoExiste = await knex('solicitacoes_de_servicos')
                .where({ idSolicitacao: id })

            if(!solicitacaoExiste){
                res.status(404).send({ error: 'Solicitação não encontrada' })
            }

            await knex('item_solicitacao')
                .where({idSolicitacao: id})
                .del()

            await knex('solicitacoes_de_servicos')
                .where({ idSolicitacao: id })
                .del()
            
            return res.send()
        } catch (error) {
            next(error)
        }
    },

    async indexDay(req, res, next){
        try {
            const { data } = req.query
            const agendamento = await knex('solicitacoes_de_servicos')
                .where(knex.raw('DATE(inicio) = ?', [data]))
            
            return res.json(agendamento)
        } catch(error){
            next(error)
        }
    },

    async filterDataAndStatus(req, res, next){
        try {
            const { data, status } = req.query

            if(!data || !status) 
                return res.status(400).json({ error: 'Parâmetros de consulta ausentes.' })
            
            const agendamentoFiltrados = await knex('solicitacoes_de_servicos')
                .whereRaw('DATE(inicio) = ? AND status = ?', [data, status])
            return res.json(agendamentoFiltrados)
        } catch(error){
            next(error)
        }
    },

    async filterStatus(req, res, next){
        try {
            const { status } = req.query

            if(!status) 
                return res.status(400).json({ error: 'Parâmetros de consulta ausentes.' })
            
            const agendamentoFiltrados = await knex('solicitacoes_de_servicos')
                .whereRaw('status = ?', [status])
            return res.json(agendamentoFiltrados)
        } catch(error){
            next(error)
        }
    },

    async filterData(req, res, next){
        try {
            const { data } = req.query

            if(!data) 
                return res.status(400).json({ error: 'Parâmetros de consulta ausentes.' })
            
            const agendamentoFiltrados = await knex('solicitacoes_de_servicos')
                .whereRaw('DATE(inicio) = ?', [data])
            return res.json(agendamentoFiltrados)
        } catch(error){
            next(error)
        }
    },

    async solicitacaoCreate(req, res, next){
        const { idCliente, idAnimal, idEspecialidade, data, horaInicio, horaTermino, preco, desconto, execucoes } = req.body
        
        try {
            const [idSolicitacao] = await knex('solicitacao_de_servicos').insert({
                idCliente,
                idAnimal,
                idEspecialidade,
                inicio: `${data} ${horaInicio}`,
                termino: `${data} ${horaTermino}`,
                preco,
                desconto,
                status: 'Pendente'
            })

            const { idServicos, idEspecialidadeOrca, idColaborador, nomeColaborador, agendaExecucao, adicional } = execucoes

            const [idItemSolicitacao] = await knex('item_solicitacao').insert({
                idServicos,
                adicional
            })

            await knex('execucoes').insert({
                idItemSolicitacao,
                idEspecialidade: idEspecialidadeOrca,
                agenda: agendaExecucao
            })
            
            return res.status(201).send({ message: 'Solicitação criada com sucesso' })
        } catch(error){
            next(error)
        }
    },

    async solicitacaoUpdate(req, res, next){
        try {
            const { idSolicitacao, idCliente, idAnimal, idEspecialidade, data, horaInicio, horaTermino, preco, desconto, execucoes } = req.body

            await knex('solicitacao_de_servicos')
                .where({ idSolicitacao }).update({
                idCliente,
                idAnimal,
                idEspecialidade,
                inicio: `${data} ${horaInicio}`,
                termino: `${data} ${horaTermino}`,
                preco,
                desconto,
            })

            for (const execucao of execucoes) {
                await knex('execucoes')
                    .where({ idExecucao: execucao.idExecucao }).update({
                        idEspecialidade: execucao.idEspecialidade,
                        agenda: execucao.agendaExecucao,
                })

                await knex('item_solicitacao')
                    .where({ idItemSolicitacao: execucao.idItemSolicitacao }).update({
                        idServicos: execucao.idServicos,
                        adicional: execucao.adicional,
                })
            }

            return res.send({ message: 'Solicitação atualizada com sucesso' });
        } catch(error){
            next(error)
        }
    },

    async solicitacaoDelete(req, res, next){
        try {
            const { idSolicitacao } = req.params

            if (!idSolicitacao)
              return res.status(400).json({ error: 'ID de solicitação inválido' })
        
            const solicitacao = await knex('solicitacao_de_servicos').where({ idSolicitacao }).first()
            if (!solicitacao)
              return res.status(404).json({ error: 'Solicitação não encontrada' })

            await knex('execucoes').where({ idSolicitacao }).del();
            await knex('item_solicitacao').where({ idSolicitacao }).del()
            const deletedRows = await knex('solicitacao_de_servicos').where({ idSolicitacao }).del()

            if (deletedRows === 0)
              return res.status(404).json({ error: 'Falha ao excluir a solicitação' })

            return res.status(200).json({ message: 'Solicitação excluída com sucesso' })
        } catch(error){
            next(error)
        }
    },

    async execucaoRead(req, res, next){
        try {
            const execucoes = await knex('execucoes')
            .select(
                'item_solicitacao.idServico as idServico',
                'execucoes.idExecucao as idExecucao',
                'execucoes.idEspecialidade as idEspecialidade',
                'especialidades.idColaborador as idColaborador',
                'colaboradores.nome as nomeColaborador',
                'agendas.data as agendaExecucao',
                'item_solicitacao.adicional as adicional'
              )
              .innerJoin('especialidades', 'execucoes.idEspecialidade', 'especialidades.idEspecialidade')
              .innerJoin('colaboradores', 'especialidades.idColaborador', 'colaboradores.idColaborador')
              .innerJoin('agendas', 'execucoes.idExecucao', 'agendas.idExecucao')
              .innerJoin('item_solicitacao', 'execucoes.idServico', 'item_solicitacao.idServicos')
        
            return res.send({ execucoes })
        } catch(error){
            next(error)
        }
    }
}