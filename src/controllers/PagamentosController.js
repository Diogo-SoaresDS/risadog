const knex = require('../database')

function calculateServicePrice(porte, item) {
    switch (porte) {
        case 'P': return item.preco_p_servico
        case 'M': return item.preco_m_servico
        case 'G': return item.preco_g_servico
        default: return 0
    }
}

module.exports = {
    async resumoPagamento(req, res, next) {
        try {
            const resumoPagamento = await knex('solicitacoes_de_servicos')
            .select(
                'clientes.nome as nome_cliente',
                'clientes.cpf as cpf_cliente',
                'animais.nome as nome_animal',
                'animais.rga as rga_animal',
                'animais.porte as porte_animal',
                'colaboradores.nome as nome_funcionario',
                'colaboradores.email as email_funcionario',
                'solicitacoes_de_servicos.inicio',
                'servicos.nome as nome_servico',
                'servicos.preco_p as preco_p_servico',
                'servicos.preco_m as preco_m_servico',
                'servicos.preco_g as preco_g_servico',
                'solicitacoes_de_servicos.desconto'
            )
            .innerJoin('clientes', 'solicitacoes_de_servicos.idCliente', 'clientes.idCliente')
            .innerJoin('animais', 'solicitacoes_de_servicos.idAnimal', 'animais.idAnimal')
            .innerJoin('colaboradores', 'solicitacoes_de_servicos.idColaborador', 'colaboradores.idColaborador')
            .innerJoin('especialidades', 'colaboradores.idEspecialidade', 'especialidades.idEspecialidade')
            .innerJoin('item_solicitacao', 'solicitacoes_de_servicos.idSolicitacao', 'item_solicitacao.idSolicitacao')
            .innerJoin('servicos', 'item_solicitacao.idServicos', 'servicos.idServicos')

            const listaResumoPagamento = resumoPagamento.map(item => ({
                cliente: {
                    nome: item.nome_cliente,
                    cpf: item.cpf_cliente,
                },
                animal: {
                    nome: item.nome_animal,
                    rga: item.rga_animal,
                    porte: item.porte_animal,
                },
                funcionario: {
                    nome: item.nome_funcionario,
                    email: item.email_funcionario,
                },
                dataHoraAgendamento: item.inicio,
                servico: {
                    nome: item.nome_servico,
                    preco: calculateServicePrice(item.porte_animal, item),
                    desconto: item.desconto,
                },
                total: {
                    total: calculateServicePrice(item.porte_animal, item) - item.desconto,
                },
            }))

            res.json(listaResumoPagamento)
        } catch (error) {
            next(error)
        }
    }
}