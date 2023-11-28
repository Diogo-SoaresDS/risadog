const knex = require('../database')

function somarObjAgendas(agendas) {
    let resultado = BigInt(0);
    
    agendas.forEach((agenda) => {
        resultado |= BigInt(`0b${agenda}`)
    })

    return resultado.toString(2).padStart(44, '0')
}

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

    async solicitacaoCreate(req, res, next) {
        const { idCliente, idAnimal, data, horaInicio, horaTermino, preco, desconto, idColaborador, execucoes } = req.body
    
        try {
            for (const execucao of execucoes) {
                const { idColaborador, idEspecialidade, agendaExecucao } = execucao;
    
                const horariosOcupados = await knex('execucoes')
                    .select('execucoes.agenda')
                    .innerJoin('especialidades', 'especialidades.idEspecialidade', 'execucoes.idEspecialidade')
                    .innerJoin('item_solicitacao', 'item_solicitacao.idItemSolicitacao', 'execucoes.idItemSolicitacao')
                    .innerJoin('solicitacoes_de_servicos', 'solicitacoes_de_servicos.idSolicitacao', 'item_solicitacao.idSolicitacao')
                    .where('especialidades.idColaborador', idColaborador)
                    .andWhere('solicitacoes_de_servicos.data', new Date(data).toISOString().split('T', 1)[0])
                    .andWhere('execucoes.idEspecialidade', idEspecialidade)
    
                const resultadoSoma = somarObjAgendas(horariosOcupados.map(item => item.agenda))
                const existeValorIgual = [...resultadoSoma].some((bit, index) => bit === '1' && agendaExecucao[index] === '1')
                if (existeValorIgual) {
                    return res.status(400).json({ message: 'Os horários selecionados não estão disponíveis. Por favor, escolha outro horário' })
                }
            }

            const [idSolicitacao] = await knex('solicitacoes_de_servicos').insert({
                idCliente,
                idAnimal,
                idColaborador,
                inicio: horaInicio,
                termino: horaTermino,
                data,
                preco,
                desconto,
                status: 'Pendente'
            })
    
            for (const execucao of execucoes) {
                const { idServico, idExecucao, idColaborador, idEspecialidade, agendaExecucao, adicional, preco, total } = execucao

                const [idItemSolicitacao] = await knex('item_solicitacao').insert({
                    idServicos: idServico,
                    idSolicitacao,
                    preco,
                    adicional
                })

                await knex('execucoes').insert({
                    idExecucao,
                    idItemSolicitacao,
                    idEspecialidade,
                    agenda: agendaExecucao
                })
            }
    
            return res.status(201).send({ message: 'Solicitação criada com sucesso' })
        } catch (error) {
            console.error(error)
            next(error)
        }
    },    

    async solicitacaoUpdate(req, res, next) {
        try {
            const { idCliente, idAnimal, data, horaInicio, horaTermino, preco, desconto, idColaborador, execucoes } = req.body
            const { idSolicitacao } = req.params
    
            await knex('solicitacoes_de_servicos').where({ idSolicitacao }).update({
                idCliente,
                idAnimal,
                idColaborador,
                inicio: horaInicio,
                termino: horaTermino,
                data,
                preco,
                desconto,
                status: 'Pendente'
            })
    
            for (const execucao of execucoes) {
                const { idServico, idExecucao, idColaborador, idEspecialidade, agendaExecucao, adicional, preco, total } = execucao;
    
                await knex('item_solicitacao').where({ idSolicitacao }).update({
                        idServicos: idServico,
                        preco,
                        adicional
                })
    
                await knex('execucoes').where({ idExecucao }).update({
                        idEspecialidade,
                        agenda: agendaExecucao
                })
            }
    
            return res.send({ message: 'Solicitação atualizada com sucesso' })
        } catch (error) {
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

    async execucaoRead(req, res, next) {
        try {
            const execucoes = await knex('solicitacoes_de_servicos')
                .select(
                    'solicitacoes_de_servicos.data as data',
                    'solicitacoes_de_servicos.inicio as horaInicio',
                    'solicitacoes_de_servicos.termino as horaTermino',
                    'solicitacoes_de_servicos.desconto as desconto',
                    'solicitacoes_de_servicos.status as status',
                    'solicitacoes_de_servicos.idColaborador as idColaborador',
                    'solicitacoes_de_servicos.idCliente as idCliente',
                    'solicitacoes_de_servicos.idAnimal as idAnimal',
                    'item_solicitacao.idServicos as idServico',
                    'servicos.nome as nomeServico',
                    'execucoes.idExecucao as idExecucao',
                    'colaboradores.nome as nomeColaborador',
                    'execucoes.idEspecialidade as idEspecialidade',
                    'execucoes.agenda as agendaExecucao',
                    'item_solicitacao.adicional as adicional',
                    'item_solicitacao.preco as preco',
                    'clientes.nome as nomeCliente',
                    'animais.nome as nomeAnimal',
                    'animais.especie as especie',
                    'animais.porte as porte'
                )
                .innerJoin('item_solicitacao', 'solicitacoes_de_servicos.idSolicitacao', 'item_solicitacao.idSolicitacao')
                .innerJoin('servicos', 'item_solicitacao.idServicos', 'servicos.idServicos')
                .innerJoin('execucoes', 'item_solicitacao.idItemSolicitacao', 'execucoes.idItemSolicitacao')
                .innerJoin('colaboradores', 'solicitacoes_de_servicos.idColaborador', 'colaboradores.idColaborador')
                .innerJoin('clientes', 'solicitacoes_de_servicos.idCliente', 'clientes.idCliente')
                .innerJoin('animais', 'solicitacoes_de_servicos.idAnimal', 'animais.idAnimal')

                const solicitacoesGrouped = {}
                execucoes.forEach((execucao) => {
                    const idSolicitacao = execucao.idSolicitacao
        
                    if (!solicitacoesGrouped[idSolicitacao]) {
                        solicitacoesGrouped[idSolicitacao] = {
                            data: execucao.data,
                            horaInicio: execucao.horaInicio,
                            horaTermino: execucao.horaTermino,
                            desconto: execucao.desconto,
                            status: execucao.status,
                            idColaborador: execucao.idColaborador,
                            idCliente: execucao.idCliente,
                            idAnimal: execucao.idAnimal,
                            execucoes: [],
                            nomeCliente: execucao.nomeCliente,
                            nomeAnimal: execucao.nomeAnimal,
                            especie: execucao.especie,
                            porte: execucao.porte,
                        }
                    }
        
                    const precoServico = 0
                    if(execucao.porte === 'P') precoServico = execucao.porte_p
                    if(execucao.porte === 'M') precoServico = execucao.porte_m
                    else precoServico = execucao.porte_g

                    const totalServico = precoServico + execucao.adicional
                    solicitacoesGrouped[idSolicitacao].execucoes.push({
                        idServico: execucao.idServicos,
                        nomeServico: execucao.nomeServico,
                        idExecucao: execucao.idExecucao,
                        idColaborador: execucao.idColaborador,
                        nomeColaborador: execucao.nomeColaborador,
                        idEspecialidade: execucao.idEspecialidade,
                        preco: execucao.preco,
                        agendaExecucao: execucao.agendaExecucao,
                        adicional: execucao.adicional,
                        total: totalServico - execucao.adicional,
                    })
                })
        
            const resultArray = Object.values(solicitacoesGrouped)
            return res.send(resultArray)
        } catch (error) {
            next(error)
        }
    }    
}