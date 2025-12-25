const { ApolloServer } = require('@apollo/server')
const { expressMiddleware } = require('@as-integrations/express5')
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { useServer } = require('graphql-ws/use/ws')
const { WebSocketServer } = require('ws')
const express = require('express')
const http = require('http')
const cors = require('cors')
const { GraphQLError } = require('graphql')
const jwt = require('jsonwebtoken')
const { PubSub } = require('graphql-subscriptions')

const JWT_SECRET = 'secret-key'
const pubsub = new PubSub()

let users = []

let authors = [
  {
    name: 'Robert Martin',
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963
  },
  {
    name: 'Fyodor Dostoevsky',
    id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
    born: 1821
  },
  { 
    name: 'Joshua Kerievsky', // birthyear not known
    id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
  },
  { 
    name: 'Sandi Metz', // birthyear not known
    id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
  },
]

/*
 * Suomi:
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
 *
 * English:
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
 *
 * Spanish:
 * Podría tener más sentido asociar un libro con su autor almacenando la id del autor en el contexto del libro en lugar del nombre del autor
 * Sin embargo, por simplicidad, almacenaremos el nombre del autor en conexión con el libro
*/

let books = [
  {
    title: 'Clean Code',
    published: 2008,
    author: 'Robert Martin',
    id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Agile software development',
    published: 2002,
    author: 'Robert Martin',
    id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
    genres: ['agile', 'patterns', 'design']
  },
  {
    title: 'Refactoring, edition 2',
    published: 2018,
    author: 'Martin Fowler',
    id: "afa5de00-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Refactoring to patterns',
    published: 2008,
    author: 'Joshua Kerievsky',
    id: "afa5de01-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'patterns']
  },  
  {
    title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
    published: 2012,
    author: 'Sandi Metz',
    id: "afa5de02-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'design']
  },
  {
    title: 'Crime and punishment',
    published: 1866,
    author: 'Fyodor Dostoevsky',
    id: "afa5de03-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'crime']
  },
  {
    title: 'Demons',
    published: 1872,
    author: 'Fyodor Dostoevsky',
    id: "afa5de04-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'revolution']
  },
]

/*
  you can remove the placeholder query once your first one has been implemented 
*/

const typeDefs = `
  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]!
  }

  type Author {
    name: String!
    id: ID!
    bookCount: Int!
    born: Int
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }

  type Subscription {
    bookAdded: Book!
  }
`

const resolvers = {
  Query: {
    bookCount: () => books.length,
    authorCount: () => authors.length,
    allBooks: (root, args) => {
      let filteredBooks = books
      if (args.author) {
        filteredBooks = filteredBooks.filter(book => book.author === args.author)
      }
      if (args.genre) {
        filteredBooks = filteredBooks.filter(book => book.genres.includes(args.genre))
      }
      return filteredBooks
    },
    allAuthors: () => {
      // Pre-calculate book counts for all authors in a single pass (solves n+1 problem)
      const bookCounts = {}
      books.forEach(book => {
        bookCounts[book.author] = (bookCounts[book.author] || 0) + 1
      })
      
      return authors.map(author => ({
        ...author,
        bookCount: bookCounts[author.name] || 0
      }))
    },
    me: (root, args, context) => {
      return context.currentUser
    },
  },
  Book: {
    author: (root) => {
      return authors.find(a => a.name === root.author)
    }
  },
  Author: {
    bookCount: (root, args, context) => {
      // Use cached bookCount if available from parent query
      if (root.bookCount !== undefined) {
        return root.bookCount
      }
      // Fallback: calculate if not pre-computed (for individual author queries)
      return books.filter(book => book.author === root.name).length
    }
  },
  Mutation: {
    addBook: (root, args, context) => {
      const currentUser = context.currentUser

      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      const { title, published, author, genres } = args

      // Validate book title
      if (title.length < 2) {
        throw new GraphQLError('Book title must be at least 2 characters long', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      // Validate author name
      if (author.length < 2) {
        throw new GraphQLError('Author name must be at least 2 characters long', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      // Check if the author already exists, if not, add them
      let authorObj = authors.find(a => a.name === author)
      if (!authorObj) {
        authorObj = {
          name: author,
          id: `afa5b6f${authors.length + 4}-344d-11e9-a414-719c6709cf3e`,
          born: null
        }
        authors.push(authorObj)
      }

      const newBook = {
        title,
        published,
        author: authorObj.name,
        genres,
        id: `afa5de0${books.length + 5}-344d-11e9-a414-719c6709cf3e`
      }

      books.push(newBook)
      pubsub.publish('BOOK_ADDED', { bookAdded: newBook })
      return newBook
    },
    editAuthor: (root, args, context) => {
      const currentUser = context.currentUser

      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      const { name, setBornTo } = args

      // Validate author name
      if (name.length < 2) {
        throw new GraphQLError('Author name must be at least 2 characters long', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      const author = authors.find(a => a.name === name)
      if (!author) {
        return null
      }
      author.born = setBornTo
      return {
        ...author,
        bookCount: books.filter(book => book.author === author.name).length
      }
    },
    createUser: (root, args) => {
      const { username, favoriteGenre } = args

      // Check if user already exists
      const existingUser = users.find(u => u.username === username)
      if (existingUser) {
        throw new GraphQLError('Username already exists', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      const newUser = {
        username,
        favoriteGenre,
        id: `user-${users.length + 1}-${Date.now()}`
      }

      users.push(newUser)
      return newUser
    },
    login: (root, args) => {
      const { username, password } = args
      const HARDCODED_PASSWORD = 'secret'

      if (password !== HARDCODED_PASSWORD) {
        throw new GraphQLError('wrong credentials', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      const user = users.find(u => u.username === username)
      if (!user) {
        throw new GraphQLError('wrong credentials', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      const userForToken = {
        username: user.username,
        id: user.id
      }

      return { value: jwt.sign(userForToken, JWT_SECRET) }
    }
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator('BOOK_ADDED')
    }
  }
}

const schema = makeExecutableSchema({ typeDefs, resolvers })

const app = express()
const httpServer = http.createServer(app)

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/',
})

const serverCleanup = useServer({ schema }, wsServer)

const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose()
          },
        }
      },
    },
  ],
})

const startServer = async () => {
  await server.start()
  
  app.use(
    '/',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const auth = req ? req.headers.authorization : null
        if (auth && auth.startsWith('Bearer ')) {
          try {
            const decodedToken = jwt.verify(
              auth.substring(7), JWT_SECRET
            )
            const currentUser = users.find(u => u.username === decodedToken.username)
            return { currentUser }
          } catch (error) {
            // Invalid token, return empty context
            return {}
          }
        }
        return {}
      },
    })
  )

  httpServer.listen(4000, () => {
    console.log(`Server ready at http://localhost:4000`)
  })
}

startServer()
