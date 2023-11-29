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

function somarObjAgendas(agendas) {
    let resultado = BigInt(0)
    
    agendas.forEach((agenda) => {
        resultado |= BigInt(`0b${agenda.objAgenda}`)
    })

    return resultado.toString(2).padStart(44, '0')
}

function subtrairObjAgenda(objAgenda, idSolicitacao) {
    const objAgendaSubtraido = objAgenda.filter(item => item.idSolicitacao !== idSolicitacao)
    return objAgendaSubtraido
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
            const query = await knex('colaboradores')
                .select(
                    'colaboradores.idColaborador as idColaborador',
                    'colaboradores.nome as nomeColaborador',
                    'execucoes.agenda as objAgenda',
                    'item_solicitacao.data as dataAgenda',
                    'especialidades.idEspecialidade as idEspecialidade',
                    'especialidades.idServicos as idServico',
                    'servicos.nome as nomeServico'
                )
                .leftJoin('especialidades', 'especialidades.idColaborador', 'colaboradores.idColaborador')
                .leftJoin('execucoes', 'execucoes.idEspecialidade', 'especialidades.idEspecialidade')
                .leftJoin('item_solicitacao', 'item_solicitacao.idItemSolicitacao', 'execucoes.idItemSolicitacao')
                .leftJoin('servicos', 'servicos.idServicos', 'especialidades.idServicos')

            const colaboradoresGrouped = {}
            query.forEach((colaborador) => {
                const idColaborador = colaborador.idColaborador;
                const dataRequisicao = new Date(data).toISOString().split('T', 1)[0]
    
                if (!colaboradoresGrouped[idColaborador]) {
                    colaboradoresGrouped[idColaborador] = {
                        idColaborador: colaborador.idColaborador,
                        nomeColaborador: colaborador.nomeColaborador,
                        objAgenda: [],
                        dataAgenda: dataRequisicao,
                        especialidades: [],
                    }
                }

                const especialidadeExiste = colaboradoresGrouped[idColaborador].especialidades.some(
                    (esp) => esp.idEspecialidade === colaborador.idEspecialidade
                )
    
                if(!especialidadeExiste && colaborador.idEspecialidade) {
                    colaboradoresGrouped[idColaborador].especialidades.push({
                        idEspecialidade: colaborador.idEspecialidade,
                        idServicos: colaborador.idServico,
                        nomeServico: colaborador.nomeServico,
                    })
                }

                const dataColaborador = new Date(colaborador.dataAgenda).toISOString().split('T', 1)[0]
                if(colaborador.objAgenda && dataColaborador === data) {
                    colaboradoresGrouped[idColaborador].objAgenda.push({
                        objAgenda: colaborador.objAgenda
                    })
                }
            })

            Object.values(colaboradoresGrouped).forEach((colaborador) => {
                colaborador.objAgenda = somarObjAgendas(colaborador.objAgenda)
            })

            const colaboradores = Object.values(colaboradoresGrouped)
            return res.send({ colaboradores })
        } catch(error){
            next(error)
        }
    },

    async agendaReadAltera(req, res, next) {
        try {
            const { data } = req.query
            const { idSolicitacao } = req.params

            const query = await knex('colaboradores')
                .select(
                    'colaboradores.idColaborador as idColaborador',
                    'colaboradores.nome as nomeColaborador',
                    'execucoes.agenda as objAgenda',
                    'item_solicitacao.data as dataAgenda',
                    'especialidades.idEspecialidade as idEspecialidade',
                    'especialidades.idServicos as idServico',
                    'servicos.nome as nomeServico'
                )
                .leftJoin('especialidades', 'especialidades.idColaborador', 'colaboradores.idColaborador')
                .leftJoin('execucoes', 'execucoes.idEspecialidade', 'especialidades.idEspecialidade')
                .leftJoin('item_solicitacao', 'item_solicitacao.idItemSolicitacao', 'execucoes.idItemSolicitacao')
                .leftJoin('servicos', 'servicos.idServicos', 'especialidades.idServicos')

            const colaboradoresGrouped = {}
            query.forEach((colaborador) => {
                const idColaborador = colaborador.idColaborador;
                const dataRequisicao = new Date(data).toISOString().split('T', 1)[0]
    
                if (!colaboradoresGrouped[idColaborador]) {
                    colaboradoresGrouped[idColaborador] = {
                        idColaborador: colaborador.idColaborador,
                        nomeColaborador: colaborador.nomeColaborador,
                        objAgenda: [],
                        dataAgenda: dataRequisicao,
                        especialidades: [],
                    }
                }

                const especialidadeExiste = colaboradoresGrouped[idColaborador].especialidades.some(
                    (esp) => esp.idEspecialidade === colaborador.idEspecialidade
                )
    
                if(!especialidadeExiste && colaborador.idEspecialidade) {
                    colaboradoresGrouped[idColaborador].especialidades.push({
                        idEspecialidade: colaborador.idEspecialidade,
                        idServicos: colaborador.idServico,
                        nomeServico: colaborador.nomeServico,
                    })
                }

                const dataColaborador = new Date(colaborador.dataAgenda).toISOString().split('T', 1)[0]
                if (colaborador.objAgenda && dataColaborador === data) {
                    const objAgendaSubtraido = subtrairObjAgenda(colaborador.objAgenda, idSolicitacao);
                    colaboradoresGrouped[idColaborador].objAgenda.push({
                        objAgenda: objAgendaSubtraido
                    })
                }
            })

            Object.values(colaboradoresGrouped).forEach((colaborador) => {
                colaborador.objAgenda = somarObjAgendas(colaborador.objAgenda)
            })

            const colaboradores = Object.values(colaboradoresGrouped)
            return res.send({ colaboradores })
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