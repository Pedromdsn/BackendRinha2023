import { fastify } from "fastify"
import { PrismaClient } from "@prisma/client"
import { createClient } from "redis"
import { config } from "dotenv"
import { randomUUID } from "crypto"
import { parse } from "date-fns"

config()
const client = createClient({ url: process.env.REDIS_URL })

const server = fastify()
const prisma = new PrismaClient()

interface Pessoa {
	id: string
	nome: string
	apelido: string
	nascimento: string
	stack: string[]
}

interface CreatePessoaDTO {
	nome: string
	apelido: string
	nascimento: string
	stack: string[] | null | undefined
}

const createPessoa = async (pessoa: CreatePessoaDTO) => {
	const id = randomUUID()
	const metaData = pessoa.nome + " " + pessoa.apelido + " " + (pessoa.stack?.join(" ") || "")

	await client.set("apelido" + pessoa.apelido, JSON.stringify(pessoa))
	await client.set("uuid" + id, JSON.stringify(pessoa))

	const data = {
		id: id,
		nome: pessoa.nome,
		apelido: pessoa.apelido,
		nascimento: pessoa.nascimento,
		stack: pessoa.stack || [],
		stackNameApelido: metaData.toLowerCase()
	}

	const newPessoa = await prisma.pessoa.create({ data })

	return newPessoa
}

const getPessoaById = async (id: string) => {
	const cachedPessoa = await client.get("uuid" + id)

	if (cachedPessoa) return JSON.parse(cachedPessoa)

	const pessoa = await prisma.pessoa.findUnique({
		where: {
			id: id
		}
	})

	return pessoa
}

const getPessoasByTerm = async (term: string) => {
	const pessoas = await prisma.pessoa.findMany({
		where: {
			stackNameApelido: {
				contains: term.toLowerCase()
			}
		},
		select: {
			id: true,
			nome: true,
			apelido: true,
			nascimento: true,
			stack: true
		},
		take: 50
	})

	return pessoas
}

interface PostPessoasRequestBody {
	nome: string
	apelido: string
	nascimento: string
	stack: string[] | null | undefined
}

// POST /pessoas
server.post("/pessoas", async (request, reply) => {
	const { nome, apelido, nascimento, stack } = request.body as PostPessoasRequestBody

	if (!nome || !apelido || !nascimento) return reply.status(422).send()

	if (typeof nome !== "string" || stack?.some((item) => typeof item !== "string")) return reply.status(400).send()

	const isValidDate = parse(nascimento, "yyyy-MM-dd", new Date())
	if (!isValidDate) return reply.status(400).send()

	const cachedPessoa = await client.get("apelido" + apelido)
	if (cachedPessoa) return reply.status(422).send()

	try {
		const pessoa = await createPessoa({ nome, apelido, nascimento, stack })
		return reply.status(201).header("Location", `/pessoas/${pessoa.id}`).send(pessoa)
	} catch (error) {
		console.log(error)
		return reply.status(400).send()
	}
})

// GET /pessoas:id
server.get("/pessoas/:id", async (request, reply) => {
	const { id } = request.params as any

	const pessoa = await getPessoaById(id)
	if (!pessoa) return reply.status(404).send()

	return reply.send(pessoa)
})

// GET /pessoas?t=[:termo da busca]
server.get("/pessoas", async (request, reply) => {
	const { t } = request.query as any
	if (!t) return reply.status(400).send()

	try {
		const pessoas = await getPessoasByTerm(t)
		return reply.send(pessoas).send()
	} catch (e) {
		return reply.send(404).send()
	}
})

// GET /contagem-pessoas
server.get("/contagem-pessoas", async (request, reply) => {
	const pessoas = await prisma.pessoa.count()
	return reply.send({ pessoas })
})

server.listen(
	{
		host: "0.0.0.0",
		port: 3333
	},
	async () => {
		await client.connect()
		await prisma.pessoa.deleteMany()
		await client.flushAll()
		console.log("Server running on port 3333")
	}
)
