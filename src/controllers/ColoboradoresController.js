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

function somarObjAgenda(objAgenda1, objAgenda2) {
    const resultado = [];
    
    for (let i = 0; i < objAgenda1.length; i++) {
        resultado.push(Number(objAgenda1[i]) + Number(objAgenda2[i]));
    }

    return resultado.join('');
}

async function groupColaboradores(queryResult, data) {
    const colaboradoresGrouped = {}

    queryResult.forEach((colaborador) => {
        const idColaborador = colaborador.idColaborador
        const dataColaborador = new Date(colaborador.dataAgenda).toISOString().split('T', 1)[0];

        if (!colaboradoresGrouped[idColaborador]) {
            colaboradoresGrouped[idColaborador] = {
                idColaborador: colaborador.idColaborador,
                nomeColaborador: colaborador.nomeColaborador,
                objAgenda: colaborador.objAgenda || '00000000000000000000000000000000000000000000',
                dataAgenda: data,
                especialidades: [],
            }
        } else if(dataColaborador !== data){
            colaboradoresGrouped[idColaborador].objAgenda = '00000000000000000000000000000000000000000000'
        } else {
            colaboradoresGrouped[idColaborador].objAgenda = somarObjAgenda(
                colaboradoresGrouped[idColaborador].objAgenda,
                colaborador.objAgenda || '00000000000000000000000000000000000000000000'
            )
        }

        if (colaborador.idEspecialidade) {
            colaboradoresGrouped[idColaborador].especialidades.push({
                idEspecialidade: colaborador.idEspecialidade,
                idServicos: colaborador.idServico,
                nomeServico: colaborador.nomeServico,
            })
        }
    })

    return Object.values(colaboradoresGrouped)
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
        const { nome, email, senha, cpf, especialidades } = req.body
        
        try {
            if(!nome || !email || !senha || !cpf || !especialidades || especialidades === 0){
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
                cpf,
                senha: hashSenha,
                status: 'Ativo'
            }

            const [idColaborador] = await knex('colaboradores').insert(usuario)
            for(const especialidade of especialidades){
                await knex('especialidades').insert({
                    idColaborador,
                    idServicos: especialidade
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
    },

    async ColaboradorRead(req, res, next){
        try {
            const colaboradores = await knex('colaboradores')
                .select(
                    'colaboradores.idColaborador as idColaborador',
                    'colaboradores.nome as nomeColaborador',
                    'agenda.data as dataAgenda',
                    'especialidades.idEspecialidade as idEspecialidade',
                    'especialidades.idServico as idServico',
                    'servico.nome as nomeServico'
                )
                .innerJoin('agendas', 'agendas.idColaborador', 'colaboradores.idColaborador')
                .innerJoin('especialidades', 'especialidades.idColaborador', 'colaborador.idColaborador')
                .innerJoin('servicos', 'servicos.idServico', 'especialidades.idServicos')

                const result = []

                colaboradores.forEach((colaborador) => {
                  const existingColaborador = result.find((c) => c.idColaborador === colaborador.idColaborador)
            
                  if (!existingColaborador) {
                    result.push({
                      idColaborador: colaborador.idColaborador,
                      nomeColaborador: colaborador.nomeColaborador,
                      agenda: colaborador.agenda,
                      dataAgenda: colaborador.dataAgenda,
                      especialidades: [
                        {
                          idEspecialidade: colaborador.idEspecialidade,
                          idServico: colaborador.idServico,
                          nomeServico: colaborador.nomeServico,
                        },
                      ],
                    })
                  } else {
                    existingColaborador.especialidades.push({
                      idEspecialidade: colaborador.idEspecialidade,
                      idServico: colaborador.idServico,
                      nomeServico: colaborador.nomeServico,
                    })
                  }
                })
            
                res.json({ colaboradores: result })
        } catch(error){
            next(error)
        }
    },

    async agendaRead(req, res, next){
        try {
            const { data } = req.query;
            const query = knex('colaboradores')
                .select(
                    'colaboradores.idColaborador as idColaborador',
                    'colaboradores.nome as nomeColaborador',
                    'execucoes.agenda as objAgenda',
                    'solicitacoes_de_servicos.data as dataAgenda',
                    'especialidades.idEspecialidade as idEspecialidade',
                    'especialidades.idServicos as idServico',
                    'servicos.nome as nomeServico'
                )
                .leftJoin('especialidades', 'especialidades.idColaborador', 'colaboradores.idColaborador')
                .leftJoin('solicitacoes_de_servicos', 'solicitacoes_de_servicos.idEspecialidade', 'especialidades.idEspecialidade')
                .leftJoin('execucoes', 'execucoes.idEspecialidade', 'especialidades.idEspecialidade')
                .leftJoin('servicos', 'servicos.idServicos', 'especialidades.idServicos')
                
            if (data) query.where('solicitacoes_de_servicos.data', data)
            const colaboradoresData = await query
            const colaboradoresArray = await groupColaboradores(colaboradoresData, data)

            const queryVazia = knex('colaboradores')
                .select(
                    'colaboradores.idColaborador as idColaborador',
                    'colaboradores.nome as nomeColaborador',
                    'execucoes.agenda as objAgenda',
                    'solicitacoes_de_servicos.data as dataAgenda',
                    'especialidades.idEspecialidade as idEspecialidade',
                    'especialidades.idServicos as idServico',
                    'servicos.nome as nomeServico'
                )
                .leftJoin('especialidades', 'especialidades.idColaborador', 'colaboradores.idColaborador')
                .leftJoin('solicitacoes_de_servicos', 'solicitacoes_de_servicos.idEspecialidade', 'especialidades.idEspecialidade')
                .leftJoin('execucoes', 'execucoes.idEspecialidade', 'especialidades.idEspecialidade')
                .leftJoin('servicos', 'servicos.idServicos', 'especialidades.idServicos')
                .where('solicitacoes_de_servicos.data', null)

            const colaboradoresDataZeros = await queryVazia
            const colaboradoresArrayZeros = await groupColaboradores(colaboradoresDataZeros, data)
            
            const algumColaboradorComDataPassada = colaboradoresData.some((colaborador) => {
                const dataAgenda = colaborador.dataAgenda ? new Date(colaborador.dataAgenda).toISOString().split('T', 1)[0] : null
                return dataAgenda === data
            })
    
            if (!algumColaboradorComDataPassada) {
                const todos = knex('colaboradores')
                .select(
                    'colaboradores.idColaborador as idColaborador',
                    'colaboradores.nome as nomeColaborador',
                    'execucoes.agenda as objAgenda',
                    'solicitacoes_de_servicos.data as dataAgenda',
                    'especialidades.idEspecialidade as idEspecialidade',
                    'especialidades.idServicos as idServico',
                    'servicos.nome as nomeServico'
                )
                .leftJoin('especialidades', 'especialidades.idColaborador', 'colaboradores.idColaborador')
                .leftJoin('solicitacoes_de_servicos', 'solicitacoes_de_servicos.idEspecialidade', 'especialidades.idEspecialidade')
                .leftJoin('execucoes', 'execucoes.idEspecialidade', 'especialidades.idEspecialidade')
                .leftJoin('servicos', 'servicos.idServicos', 'especialidades.idServicos')

                const colaboradoresDataTodos = await todos
                const colaboradoresArrayTodos = await groupColaboradores(colaboradoresDataTodos, data)

                return res.json({ colaboradores: colaboradoresArrayTodos })
            }

            const colaboradores = Object.values(colaboradoresArray).concat(Object.values(colaboradoresArrayZeros));
            return res.json({ colaboradores })
        } catch(error){
            next(error)
        }
    },

    async listaTodos(req, res, next){
        try {
            const { data } = req.query
            const query = knex('colaboradores')
                .select(
                    'colaboradores.idColaborador as idColaborador',
                    'colaboradores.nome as nomeColaborador',
                    'agendas.objAgenda as objAgenda',
                    'agendas.data as dataAgenda',
                    'especialidades.idEspecialidade as idEspecialidade',
                    'especialidades.idServicos as idServico',
                    'servicos.nome as nomeServico'
                )
                .leftJoin('agendas', 'agendas.idColaborador', 'colaboradores.idColaborador')
                .leftJoin('especialidades', 'especialidades.idColaborador', 'colaboradores.idColaborador')
                .leftJoin('servicos', 'servicos.idServicos', 'especialidades.idServicos')
    
            const colaboradoresGrouped = {}
            const colaboradoresData = await query
    
            colaboradoresData.forEach((colaborador) => {
                if (!colaboradoresGrouped[colaborador.idColaborador]) {
                    colaborador.dataAgenda = new Date(colaborador.dataAgenda).toISOString().split('T', 1)[0];
                    colaboradoresGrouped[colaborador.idColaborador] = {
                        idColaborador: colaborador.idColaborador,
                        nomeColaborador: colaborador.nomeColaborador,
                        objAgenda: colaborador.objAgenda || '00000000000000000000000000000000000000000000',
                        dataAgenda: data,
                        especialidades: [],
                    }
                }
                if (colaborador.idEspecialidade) {
                    colaboradoresGrouped[colaborador.idColaborador].especialidades.push({
                        idEspecialidade: colaborador.idEspecialidade,
                        idServicos: colaborador.idServico,
                        nomeServico: colaborador.nomeServico,
                    })
                }
            })

            const colaboradoresArray = Object.values(colaboradoresGrouped)    
            return res.json({ colaboradores: colaboradoresArray })
        } catch(error){
            next(error)
        }
    }
}