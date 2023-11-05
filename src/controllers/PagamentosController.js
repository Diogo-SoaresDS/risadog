const knex = require('../database')

module.exports = {
    async resumoPagamento(req, res, next) {
        try{
            const resumo = await knex('solicitacoes_de_servicos')
                .select('clientes.nome as nome_cliente', 'clientes.cpf as cpf_cliente', 
                    'animais.nome as nome_animal', 'animais.rga as rga_animal', 'animais.porte as porte_animal', 'colaboradores.nome as nome_funcionario', 'colaboradores.email as email_funcionario', 'solicitacoes_de_servicos.inicio'
                )
                .innerJoin('clientes', 'solicitacoes_de_servicos.idCliente', 'clientes.idCliente')
                .innerJoin('animais', 'solicitacoes_de_servicos.idAnimal', 'animais.idAnimal')
                .innerJoin('especialidades', 'solicitacoes_de_servicos.idEspecialidade', 'especialidades.idEspecialidade')
                .innerJoin('colaboradores', 'especialidades.idColaborador', 'colaboradores.idColaborador')

                const listaResumoPagamento = resumo.map(item => ({
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
                }))
        
                res.json(listaResumoPagamento)
        } catch(error){
            next(error)
        }
    }
}