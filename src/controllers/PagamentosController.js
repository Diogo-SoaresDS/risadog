const knex = require('../database')

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
                    'servicos.preco_p as preco_servico',
                    'solicitacoes_de_servicos.desconto'
                )
                .innerJoin('clientes', 'solicitacoes_de_servicos.idCliente', 'clientes.idCliente')
                .innerJoin('animais', 'solicitacoes_de_servicos.idAnimal', 'animais.idAnimal')
                .innerJoin('especialidades', 'solicitacoes_de_servicos.idEspecialidade', 
                    'especialidades.idEspecialidade')
                .innerJoin('colaboradores', 'especialidades.idColaborador', 'colaboradores.idColaborador')
                .innerJoin('item_solicitacao', 'solicitacoes_de_servicos.idSolicitacao', 
                    'item_solicitacao.idSolicitacao')
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
                    preco: item.preco_servico,
                    desconto: item.desconto,
                },
            }))
    
            res.json(listaResumoPagamento)
        } catch (error) {
            next(error)
        }
    }
}