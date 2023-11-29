const knex = require('../database')

function somarObjAgendas(agendas) {
    let resultado = BigInt(0)
    
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
                    data,
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
        const { idCliente, idAnimal, data, status, horaInicio, horaTermino, preco, desconto, idColaborador, execucoes } = req.body
        const { idSolicitacao } = req.params
        
        try {
            await knex('execucoes')
                .innerJoin('item_solicitacao', 'item_solicitacao.idItemSolicitacao', 'execucoes.idItemSolicitacao')
                .where('item_solicitacao.idSolicitacao', idSolicitacao)
                .update({ idItemSolicitacao: null })

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
                    .andWhereNotNull('execucoes.status')
    
                const resultadoSoma = somarObjAgendas(horariosOcupados.map(item => item.agenda))
                const existeValorIgual = [...resultadoSoma].some((bit, index) => bit === '1' && agendaExecucao[index] === '1')
                if (existeValorIgual) {
                    return res.status(400).json({ message: 'Os horários selecionados não estão disponíveis. Por favor, escolha outro horário' })
                }
            }

            await knex('execucoes')
                .innerJoin('item_solicitacao', 'item_solicitacao.idItemSolicitacao', 'execucoes.idItemSolicitacao')
                .innerJoin('solicitacoes_de_servicos', 'solicitacoes_de_servicos.idSolicitacao', 'item_solicitacao.idSolicitacao')
                .where('solicitacoes_de_servicos.idSolicitacao', idSolicitacao)
                .del()

            await knex('item_solicitacao')
                .innerJoin('solicitacoes_de_servicos', 'solicitacoes_de_servicos.idSolicitacao', 'item_solicitacao.idSolicitacao')
                .where('solicitacoes_de_servicos.idSolicitacao', idSolicitacao)
                .del()
    
            await knex('solicitacoes_de_servicos').where({ idSolicitacao }).update({
                idCliente,
                idAnimal,
                idColaborador,
                inicio: horaInicio,
                termino: horaTermino,
                data,
                preco,
                desconto,
                status
            })
    
            for (const execucao of execucoes) {
                const { idServico, idExecucao, idColaborador, idEspecialidade, agendaExecucao, adicional, preco, total } = execucao

                const [idItemSolicitacao] = await knex('item_solicitacao').insert({
                    idServicos: idServico,
                    idSolicitacao,
                    data,
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
            const { data } = req.query
            const query = await knex('solicitacoes_de_servicos')
                .select(
                    'solicitacoes_de_servicos.idSolicitacao as idSolicitacao',
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
                .where('item_solicitacao.data', data)
                .orderBy('solicitacoes_de_servicos.inicio', 'asc')

            const solicitacoesGrouped = {}
            for (const execucao of query) {
                const idSolicitacao = execucao.idSolicitacao
                if (!solicitacoesGrouped[idSolicitacao]) {
                    solicitacoesGrouped[idSolicitacao] = {
                        idSolicitacao: idSolicitacao,
                        data: new Date(execucao.data).toISOString().split('T', 1)[0],
                        horaInicio: execucao.horaInicio,
                        horaTermino: execucao.horaTermino,
                        preco: 0,
                        desconto: Number(execucao.desconto),
                        status: execucao.status,
                        idColaborador: execucao.idColaborador,
                        execucoes: [],
                        idCliente: Number(execucao.idCliente),
                        nomeCliente: execucao.nomeCliente,
                        idAnimal: execucao.idAnimal,
                        nomeAnimal: execucao.nomeAnimal,
                        especie: execucao.especie,
                        porte: execucao.porte
                    }
                }

                const especialidadeInfo = await knex('especialidades')
                    .select('idColaborador')
                    .where('idEspecialidade', execucao.idEspecialidade)
                    .first()

                const colaboradorInfo = await knex('colaboradores')
                    .select('nome')
                    .where('idColaborador', especialidadeInfo.idColaborador)
                    .first()

                let precoServico = 0
                if (execucao.porte === 'P') {
                    const result = await knex('servicos')
                        .select('preco_p')
                        .where('idServicos', execucao.idServico)
                        .first()
                
                    precoServico = result ? Number(result.preco_p) : 0
                } else if (execucao.porte === 'M') {
                    const result = await knex('servicos')
                        .select('preco_m')
                        .where('idServicos', execucao.idServico)
                        .first()
                
                    precoServico = result ? Number(result.preco_m) : 0
                } else {
                    const result = await knex('servicos')
                        .select('preco_m')
                        .where('idServicos', execucao.idServico)
                        .first()
                
                    precoServico = result ? Number(result.preco_m) : 0
                }

                precoServico += Number(execucao.adicional)
                let precoComDesconto = precoServico - (precoServico * Number(execucao.desconto)) 
                if(precoComDesconto < 0) precoComDesconto *= -1
                solicitacoesGrouped[idSolicitacao].preco += Number(precoComDesconto.toFixed(2))
                solicitacoesGrouped[idSolicitacao].execucoes.push({
                    idServico: Number(execucao.idServico),
                    nomeServico: execucao.nomeServico,
                    idExecucao: execucao.idExecucao,
                    idColaborador: especialidadeInfo.idColaborador,
                    nomeColaborador: colaboradorInfo.nome,
                    idEspecialidade: execucao.idEspecialidade,
                    agendaExecucao: execucao.agendaExecucao,
                    preco: precoServico,
                    adicional: Number(execucao.adicional),
                    total: precoServico
                })
            }
        
            const resultArray = Object.values(solicitacoesGrouped)
            return res.send(resultArray)
        } catch (error) {
            next(error)
        }
    }
}