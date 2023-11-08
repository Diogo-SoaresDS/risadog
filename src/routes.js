const express = require('express')
const routes = express.Router()
// const authMiddeware = require('./middlewares/auth')
const colaboradoresController = require('./controllers/ColoboradoresController')
const clientesController = require('./controllers/ClientesController')
const animaisController = require('./controllers/AnimaisController')
const agendasController = require('./controllers/AgendasController')
const servicesController = require('./controllers/ServicesController')

routes.post('/cadastro', colaboradoresController.create)
routes.post('/login', colaboradoresController.login)
// routes.use(authMiddeware)

// Colaboradores
routes.get('/agendas', colaboradoresController.index)
routes.post('/colaborador', colaboradoresController.filterToServices)
routes.get('/agendas/colaboradores', colaboradoresController.agendaRead)

// Clientes
routes.post('/agendas/nova-solicitacao', clientesController.createClientAnimals)
routes.get('/agendas/nova-solicitacao', clientesController.index)
routes.get('/agendas/cliente', clientesController.buscaClient)
routes.get('/agendas/cliente/animais/:idCliente', clientesController.listAnimalsClient)
routes.put('/agendas/cliente/:idCliente', clientesController.update)
routes.get('/agendas/nova-solicitacao/:id/animais', clientesController.listAnimals)

// Animais
routes.post('/agendas/nova-solicitacao/:id/animais', animaisController.create)
routes.put('/agendas/nova-solicitacao/animais/:idAnimal', animaisController.update)
routes.delete('/agendas/nova-solicitacao/animais/:idAnimal', animaisController.delete)
routes.get('/agendas/nova-solicitacao/animais/:id', animaisController.listAgender)

// Agendas
routes.post('/agendas', agendasController.create)
routes.get('/agendas', agendasController.index)
routes.get('/agendas/dia', agendasController.indexDay)
routes.put('/agendas/:id', agendasController.update)
routes.delete('/agendas/:id', agendasController.delete)
routes.get('/agendas/filter', agendasController.filterDataAndStatus)
routes.get('/solicitacao', agendasController.execucaoRead)
routes.post('/solicitacao', agendasController.solicitacaoCreate)
routes.put('/solicitacao', agendasController.solicitacaoUpdate)
routes.delete('/solicitacao/:idSolicitacao', agendasController.solicitacaoDelete)

// Execuções
routes.post('/execucoes')

// Serviços
routes.get('/servicos', servicesController.index)

module.exports = routes