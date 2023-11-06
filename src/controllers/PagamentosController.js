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
            const resumoPagamento = await knex('Solicitacoes_de_servicos')
            .select(
                'Clientes.nome as nome_cliente',
                'Clientes.cpf as cpf_cliente',
                'Animais.nome as nome_animal',
                'Animais.rga as rga_animal',
                'Animais.porte as porte_animal',
                'Colaboradores.nome as nome_funcionario',
                'Colaboradores.email as email_funcionario',
                'Solicitacoes_de_servicos.inicio',
                'Servicos.nome as nome_servico',
                'Servicos.preco_p as preco_p_servico',
                'Servicos.preco_m as preco_m_servico',
                'Servicos.preco_g as preco_g_servico',
                'Solicitacoes_de_servicos.desconto'
            )
            .innerJoin('Clientes', 'Solicitacoes_de_servicos.idCliente', 'Clientes.idCliente')
            .innerJoin('Animais', 'Solicitacoes_de_servicos.idAnimal', 'Animais.idAnimal')
            .innerJoin('Especialidades', 'Solicitacoes_de_servicos.idEspecialidade', 'Especialidades.idEspecialidade')
            .innerJoin('Colaboradores', 'Especialidades.idColaborador', 'Colaboradores.idColaborador')
            .innerJoin('Item_solicitacao', 'Solicitacoes_de_servicos.idSolicitacao', 'Item_solicitacao.idSolicitacao')
            .innerJoin('Servicos', 'Item_solicitacao.idServicos', 'Servicos.idServicos')

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