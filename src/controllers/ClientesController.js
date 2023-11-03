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
    async index(req, res, next) {
        try {
            const results = await knex('clientes')
            return res.json(results)
        } catch(error){
            next(error)
        }
    },

    async create(req, res, next) {    
        const { nome, cpf, dtNasc, tel1, tel2, email, cep, logradouro, numeroRes, complemento, bairro, localidade, uf } = req.body

        try {
            await clienteSchema.validate(req.body, { abortEarly: false })
            const dataDeCadastro = new Date()
            await knex('clientes').insert({
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

            return res.status(201).send({ message: 'Cliente criado com sucesso' })
        } catch (error) {
            if (error instanceof Yup.ValidationError)
                return res.status(400).json({ error: error.errors })
            next(error)
        }
    },
   
    async update(req, res, next) {
        const { nome, cpf, dtNasc, tel1, tel2, email, cep, logradouro, numeroRes, complemento, bairro, localidade, uf } = req.body
        const { id } = req.params
        
        try{
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
            }).where({ idCliente: id })
            
            return res.send()
        } catch (error) {
            if (error instanceof Yup.ValidationError)
                return res.status(400).json({ error: 'Dados de entrada inválidos', details: error.errors })
            next(error)
        }
    },
    
    async delete(req, res, next) {
        try {
            const { id } = req.params
            
            await knex('clientes')
                .where({ idCliente: id })
                .del()
            
            return res.send()
        } catch(error) {
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
        try {
            const { valor } = req.query;
            if (!valor) {
                return res.status(400).json({ error: 'Parâmetro não informado' });
            }

            let query = knex('clientes');
            if (!isNaN(valor)) {
                query.where('cpf', valor);
            } else {
                query.where('nome', 'like', `%${valor}%`);
            }

            const cliente = await query.first();

            if (!cliente) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }

            const animais = await knex('animais')
                .select('animais.*')
                .innerJoin('propriedades', 'animais.idAnimal', 'propriedades.idAnimal')
                .where('propriedades.idCliente', cliente.idCliente);

            return res.json(animais);
        } catch (error) {
            next(error);
        }
    },

    async buscaClient(req, res, next){
        const { valor } = req.query

        if (!valor) {
            return res.status(400).json({ error: 'Parâmetro não informado' })
        }

        let query = knex('clientes')

        if (!isNaN(valor)) {
            query.where('cpf', valor)
        } else {
            query.where('nome', 'like', `%${valor}%`)
        }

        try {
            const cliente = await query.first()

            if (cliente) {
                return res.json(cliente)
            } else {
                return res.status(404).json({ error: 'Cliente não encontrado' })
            }
        } catch(error){
            next(error)
        }
    },

    async listNomesCpf(req, res, next){
        try{
            const results = await knex('clientes').select('nome', 'cpf')
            return res.json(results)
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
    
            if (Array.isArray(animais) || animais.length > 0) {
                for (const animal of animais) {
                    const { nome, especie, raca, genero, rga, obs } = animal
        
                    const novoAnimal = {
                        nome,
                        especie,
                        raca,
                        genero,
                        rga,
                        obs,
                        status: 'Ativo'
                    }

                    const [idAnimal] = await knex('animais').insert(novoAnimal).returning('idAnimal')
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