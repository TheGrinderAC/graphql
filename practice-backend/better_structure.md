Modularizing your GraphQL schema code - Apollo GraphQL Blog
6 min. readView original
As your GraphQL application grows from demo, to proof of concept, to production, the complexity of your schema and resolvers will grow in tandem. To organize your code, you’ll want to split up your schema types and the associated resolvers into multiple files.

We get this question frequently since there are a lot of different approaches to splitting up your schema code, and it might seem that you need a complex setup to get a good result. But it turns out that we can arrange our schema and resolver code in separate files with just a few simple JavaScript concepts.

In this post, we present a straightforward method for modularizing schemas built with graphql-tools that you can tweak to match your tastes and your codebase.

Schema
If you’re just starting out and have your entire schema defined in one file, it might look much like the below snippet. Here, we’ll call it schema.js:

// schema.js

const typeDefs = `
  type Query {
	    author(id: Int!): Post
    book(id: Int!): Post
  }  

  type Author {
	    id: Int!
    firstName: String
    lastName: String
    books: [Book]
  }  

  type Book {
	    title: String
    author: Author
  }
`;

makeExecutableSchema({
	  typeDefs: typeDefs,
  resolvers: {},
});
Ideally, instead of having everything in one schema definition string, we’d like to put the schema types for Author and Book in files called author.js and book.js.

At the end of the day, the schema definitions we’ve written in the Schema Definition Language (SDL) are just strings. Treating them as such, we have a simple way of importing type definitions across different files: Split up the string into multiple strings that we can combine later. This is what author.js would look like:

// author.js
export const typeDef = `
  type Author {
	    id: Int!
    firstName: String
    lastName: String
    books: [Book]
  }
`;
Here’s book.js:

// book.js
export const typeDef = `
  type Book {
	    title: String
    author: Author
  }
`;
Finally, we pull it all together in schema.js:

// schema.js
import { typeDef as Author } from './author.js';
import { typeDef as Book } from './book.js';

const Query = `
  type Query {
	    author(id: Int!): Post
    book(id: Int!): Post
  }
`;

makeExecutableSchema({
	  typeDefs: [ Query, Author, Book ],
  resolvers: {},
});
We’re not doing anything fancy here: we’re just importing strings that happen to contain some SDL. Note that for convenience you don’t need to combine the strings yourself — makeExecutableSchema can actually accept an array of type definitions directly to facilitate this approach.

Resolvers
Now that we have a way to chop up our schema into logical parts, we want to be able to move each resolver with its associated part of the schema as well. In general, we want to keep resolvers for a certain type in the same file as the schema definition for that type.

Expanding on our previous example, here’s our schema.js file with some resolvers added into the picture:

// schema.js
import { typeDef as Author } from './author.js';
import { typeDef as Book } from './book.js';

const Query = `
  type Query {
	    author(id: Int!): Post
    book(id: Int!): Post
  }
`;

const resolvers = {
	  Query: {
	    author: () => { ... },
    book: () => { ... },
  },
  Author: {
	    name: () => { ... },
  },
  Book: {
	    title: () => { ... },
  },
};

makeExecutableSchema({
	  typeDefs: [ Query, Author, Book ],
  resolvers,
});
Just like we split up the schema definition string, we can split up the resolvers object. We can put a piece of it in author.js, another in book.js, and then import them and use the lodash.merge function to put it all together in schema.js.

Here’s what author.js would look like in that case:

// author.js
export const typeDef = `
  type Author {
	    id: Int!
    firstName: String
    lastName: String
    books: [Book]
  }
`;

export const resolvers = {
	  Author: {
	    books: () => { ... },
  }
};
Here’s book.js:

// book.js
export const typeDef = `
  type Book {
	    title: String
    author: Author
  }
`;

export const resolvers = {
	  Book: {
	    author: () => { ... },
  }
};
Then, we apply lodash.merge in schema.js to put everything together:

import { merge } from 'lodash';
import { 
  typeDef as Author, 
  resolvers as authorResolvers,
} from './author.js';
import { 
  typeDef as Book, 
  resolvers as bookResolvers,
} from './book.js';

const Query = `
  type Query {
	    author(id: Int!): Author
    book(id: Int!): Book
  }
`;

const resolvers = {
	  Query: { 
    ...,
  }
};

makeExecutableSchema({
	  typeDefs: [ Query, Author, Book ],
  resolvers: merge(resolvers, authorResolvers, bookResolvers),
});
And that gives us the resolvers structure that we started out with!

Extending types in multiple files
We’re still defining authors and books as top-level fields on Query within schema.js, even though these are logically tied to Author and Book and should live in author.js and book.js.

To accomplish that, we can use type extensions. We can define our existing Query type like this:

const Query = `
  type Query {
	    _empty: String
  }
  
  extend type Query {
	    author(id: Int!): Author 
  }
  
  extend type Query {
	    book(id: Int!): Book 
  }
`;
Note: In the current version of GraphQL, you can’t have an empty type even if you intend to extend it later. So we need to make sure the Query type has at least one field — in this case we can add a fake _empty field. Hopefully in future versions it will be possible to have an empty type to be extended later.

Basically, the extend keyword lets us add fields to an already-defined type. We can use this keyword in order to define Query fields relevant to those types in book.js and author.js. We should then also move to defining the Query resolvers for those types in the same place.

Here’s what author.js looks like with this approach:

// author.js

export const typeDef = `
  extend type Query {
	    author(id: Int!): Author
  }  
  
  type Author {
	    id: Int!
    firstName: String
    lastName: String
    books: [Book]
  }
`;

export const resolvers = {
	  Query: {
	    author: () => { ... },
  },
  Author: {
	    books: () => { ... },
  }
};
This is what book.js looks like:

// book.js

export const typeDef = `
  extend type Query {
	    book(id: Int!): Book
  }  

  type Book {
	    title: String
    author: Author
  }
`;

export const resolvers = {
	  Query: {
	    book: () => { ... },
  },
  Book: {
	    author: () => { ... },
  }
};
Just as before, we put it all together in schema.js:

import { merge } from 'lodash';
import { 
  typeDef as Author, 
  resolvers as authorResolvers,
} from './author.js';
import { 
  typeDef as Book, 
  resolvers as bookResolvers,
} from './book.js'; 

// If you had Query fields not associated with a
// specific type you could put them here
const Query = `
  type Query {
	    _empty: String
  }
`;

const resolvers = {};

makeExecutableSchema({
	  typeDefs: [ Query, Author, Book ],
  resolvers: merge(resolvers, authorResolvers, bookResolvers),
});
Now, the schema and resolver definitions are properly co-located with the associated types!

Final tips
We’ve just been through the mechanics of modularizing your server code. Here are a few additional tips that may be helpful in figuring out how to carve up your codebase:

When learning, prototyping or even building a POC, putting your whole schema in a single file is likely fine: There are benefits to be able to go through your whole schema really quickly, or explain it to a coworker.
You can organize your schema and resolvers by feature: for example, putting the stuff related to the checkout system together might make sense in an ecommerce site.
Keep your resolvers in the same file as the schema definition for the fields they implement. This will allow you to reason about your code efficiently.
Wrap your SDL type definitions with a gql tag using graphql-tag. If you’re using a GraphQL plugin for your editor or formatting your code with Prettier, you’ll be able to get syntax highlighting for SDL within your code editor as long as you prefix it with the gql tag.
Now, go forth and organize your code!`
