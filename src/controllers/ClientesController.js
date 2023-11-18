const knex = require('../database')
const Yup = require('yup');

const clienteSchema = Yup.object().shape({
    nome: Yup.string().required('O nome é obrigatório.'),
    cpf: Yup.string().matches(/^\d{11}$/, 'CPF inválido. Deve conter 11 dígitos numéricos.')
        .required('CPF é obrigatório'),
    dtNasc: Yup.date().max(new Date(), 'A data de nascimento não pode ser no futuro.'),
    tel1: Yup.string().max(13, 'Número de celular muito longo.').required('O número de celular é obrigatório.'),
    tel2: Yup.string().max(12, 'Número de telefone muito longo.'),
    email: Yup.string().email('E-mail inválido.'),
    cep: Yup.string().matches(/^\d{5}-\d{3}$/, 'CEP inválido. Deve ter o formato XXXXX-XXX.')
        .required('CEP é obrigatório'),
    logradouro: Yup.string(),
    numeroRes: Yup.string().required('O número de residência é obrigatório.'),
    complemento: Yup.string(),
    bairro: Yup.string(),
    localidade: Yup.string(),
    uf: Yup.string().matches(/^[A-Z]{2}$/, 'UF inválido. Deve conter duas letras maiúsculas.'),
})

module.exports = { 
    async index(req, res, next){
        try{
            const results = await knex('clientes').select('nome', 'cpf')
            return res.json(results)
        } catch(error){
            next(error)
        }
    },

    async update(req, res, next) {
        const { nome, cpf, dtNasc, tel1, tel2, email, cep, logradouro, numeroRes, complemento, bairro, localidade, uf, animais } = req.body
        const { idCliente } = req.params
        
        try{
            const existingClient = await knex('clientes').where({ idCliente }).first()
            if (!existingClient) 
                return res.status(404).json({ error: 'Cliente não encontrado.' })

            await clienteSchema.validate(req.body, { abortEarly: false })
            await knex('clientes').update({
                nome, 
                cpf, 
                dtNasc, 
                tel1, 
                tel2, 
                email, 
                cep, 
                logradouro, 
                numeroRes, 
                complemento, 
                bairro, 
                localidade, 
                uf
            }).where({ idCliente })

            if (Array.isArray(animais) && animais.length > 0) {
                const existingAnimalIds = await knex('propriedades').where({ idCliente }).pluck('idAnimal')
    
                for (const animal of animais) {
                    const { idAnimal, nome, especie, raca, genero, porte, rga, obs } = animal
    
                    if (existingAnimalIds.includes(idAnimal)) {
                        await knex('animais').update({ status: 'Ativo' }).where({ idAnimal })
                    } else {
                        await knex('animais').insert({
                            idAnimal,
                            nome,
                            especie,
                            raca,
                            genero,
                            rga,
                            obs,
                            porte,
                            status: 'Ativo'
                        })
    
                        await knex('propriedades').insert({
                            idCliente,
                            idAnimal
                        })
                    }
                }
    
                const notMentionedAnimalIds = existingAnimalIds.filter(id => !animais.some(a => a.idAnimal === id))
                if (notMentionedAnimalIds.length > 0) {
                    await knex('animais').update({ status: 'Desativado' }).whereIn('idAnimal', notMentionedAnimalIds)
                }
            } else {
                await knex('animais').update({ status: 'Desativado' }).where({ idCliente })
            }

            return res.status(201).send({ message: 'Cliente atualizado com sucesso'})
        } catch (error) {
            if (error instanceof Yup.ValidationError)
                return res.status(400).json({ error: error.errors })
            next(error)
        }
    },

    async listAgender(req, res, next) {
        try {
            const { id } = req.query
            const agendamentos = await knex('clientes')
                .where({ idCliente: id })

            return res.json(agendamentos)
        } catch(error){
            next(error)
        }
    },

    async listAnimals(req, res, next){
        try {
            const { id } = req.params
            const animais = await knex('animais')
                .select('animais.*')
                .innerJoin('propriedades', 'animais.idAnimal', 'propriedades.idAnimal')
                .where('propriedades.idCliente', id)

            return res.json(animais)
        } catch(error){
            next(error)
        }
    },

    async listAnimalsClient(req, res, next){
        const { idCliente } = req.params
        
        try {
            const animais = await knex('animais')
                .select('animais.*')
                .innerJoin('propriedades', 'animais.idAnimal', 'propriedades.idAnimal')
                .where('propriedades.idCliente', idCliente)
                .andWhere('animais.status', 'Ativo')

            return res.json(animais)
        } catch (error) {
            next(error)
        }
    },

    async buscaClient(req, res, next){
        const { valor } = req.query

        if (!valor) {
            return res.status(400).json({ error: 'Parâmetro não informado' })
        }

        let query = knex('clientes')

        if (!isNaN(valor)) {
            query.where('cpf', 'like', `%${valor}%`)
        } else {
            query.where('nome', 'like', `%${valor}%`)
        }

        try {
            const cliente = await query

            if (cliente) {
                const formattedClientes = cliente.map((cliente) => {
                    if (cliente.dtCadastro)
                        cliente.dtCadastro = new Date(cliente.dtCadastro).toISOString().split('T', 1)[0]
                    if (cliente.dtNasc)
                        cliente.dtNasc = new Date(cliente.dtNasc).toISOString().split('T', 1)[0]
                    return cliente
                })
                return res.json(formattedClientes)
            } else {
                return res.status(404).json({ error: 'Cliente não encontrado' })
            }
        } catch(error){
            next(error)
        }
    },

    async createClientAnimals(req, res, next){
        const { nome, cpf, dtNasc, tel1, tel2, email, cep, logradouro, numeroRes, complemento, bairro, localidade, uf, animais } = req.body

        try {
            const existingClient = await knex('clientes').where({ cpf }).first()
            if (existingClient) 
                return res.status(400).json({ error: 'CPF já está em uso.' })

            await clienteSchema.validate(req.body, { abortEarly: false })
            const dataDeCadastro = new Date()
            const [idCliente] = await knex('clientes').insert({
                nome,
                cpf,
                dtNasc,
                tel1,
                tel2,
                email,
                cep,
                logradouro,
                numeroRes,
                complemento,
                bairro,
                localidade,
                uf,
                status: 'Ativo',
                dtCadastro: dataDeCadastro
            })
    
            if (Array.isArray(animais) && animais.length > 0) {
                for (const animal of animais) {
                    const { idAnimal, nome, especie, raca, genero, porte, rga, obs } = animal
        
                    const novoAnimal = {
                        idAnimal,
                        nome,
                        especie,
                        raca,
                        genero,
                        rga,
                        porte,
                        obs,
                        status: 'Ativo'
                    }

                    await knex('animais').insert(novoAnimal)
                    await knex('propriedades').insert({
                        idCliente,
                        idAnimal
                    })
                }
            }

            return res.status(201).send({ message: 'Cliente criado com sucesso' })
        } catch (error) {
            if (error instanceof Yup.ValidationError)
                return res.status(400).json({ error: error.errors })
            next(error)
        }
    }
}