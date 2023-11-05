const knex = require('../database')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Yup = require('yup')
const dotenv = require('dotenv').config()

function gerarToken(params = {}){
    return jwt.sign({ params }, process.env.SECRET, {
        expiresIn: 86400
    })
}

const colaboradorSchema = Yup.object().shape({
    email: Yup.string().required('Email obrigatório'),
    senha: Yup.string().required('Senha Obrigatório')
}) 

module.exports = {
    async index(req, res, next) {
        try {
            const results = await knex('colaboradores')
            return res.json(results)
        } catch(error){
            next(error)            
        }
    },
    
    async create(req, res, next){
        const { nome, email, senha, especialidades } = req.body
        
        try {
            if(!nome || !email || !senha || !especialidades || especialidades === 0){
                return res.status(400).json({ error: 'Por favor, forneça todos os campos obrigatórios' })
            }

            const usuarioValido = await knex('colaboradores')
                .where({ email })
                .first()

            if(usuarioValido){
                return res.status(400).send({ error: 'Usuario já cadastrado' })
            }

            const hashSenha = await bcrypt.hash(senha, 10)
            const usuario = {
                nome,
                email,
                senha: hashSenha,
                status: 'Ativo'
            }

            const [idColaborador] = await knex('colaboradores').insert(usuario)
            for(const especialidade of especialidades){
                await knex('especialidades').insert({
                    idColaborador,
                    idEspecialidade: especialidade
                })
            }

            return res.send({
                usuario, 
                token: gerarToken({ idColoborador: usuario.idColoborador })
            })
        } catch(error){
            next(error)
        }
    },

    async login(req, res, next){
        const { email, senha } = req.body
        
        try {
            await colaboradorSchema.validate(req.body, { abortEarly: false })
            const usuario = await knex('colaboradores')
                .where({ email })
                .first()

            if(!usuario){
                return res.status(400).send({ error: 'Usuário não encontrado' })
            }

            const senhaValida = await bcrypt.compare(senha, usuario.senha)
            if(!senhaValida){
                return res.status(400).send({ error: 'Senha Inválida' })
            }

            usuario.senha = undefined
            return res.send({ 
                usuario, 
                token: gerarToken({ idColoborador: usuario.idColoborador }) 
            })
        } catch(error){
            if (error instanceof Yup.ValidationError)
                return res.status(400).json({ error: error.errors })
            next(error)
        }
    },

    async filterToServices(req, res, next){
        const { id } = req.query

        try {
            const funcionarios = await knex('colaboradores')
                .distinct('colaboradores.*')
                .innerJoin('especialidades', 'colaboradores.idColaborador', 'especialidades.idColaborador')
                .where('especialidades.idServicos', id)

            res.json(funcionarios)
        } catch (error) {
            next(error)
        }
    }
}