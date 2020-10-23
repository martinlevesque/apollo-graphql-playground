const express = require('express');
const { ApolloServer, gql, PubSub } = require('apollo-server-express');
const { find, filter } = require('lodash');
const http = require('http');


const pubsub = new PubSub();

const POST_UPVOTED = 'POST_UPVOTED2';

// Construct a schema, using GraphQL schema language

// this could go close to the models

const typeDefs = gql`

  type Subscription {
    postUpvoted: Post
  }

  type Author {
    id: Int!
    firstName: String
    lastName: String
    """
    the list of Posts by this author
    """
    posts: [Post]
  }

  type Post {
    id: Int!
    title: String
    author: Author
    votes: Int
  }

  # the schema allows the following query:
  type Query {
    posts: [Post]
    post(id: Int!): Post
    author(id: Int!): Author
  }

  # this schema allows the following mutation:
  type Mutation {
    upvotePost (
      postId: Int!
    ): Post
  }`;

const authors = [
  { id: 1, firstName: 'Tom', lastName: 'Coleman' },
  { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
  { id: 3, firstName: 'Mikhail', lastName: 'Novikov' },
];

const posts = [
  { id: 1, authorId: 1, title: 'Introduction to GraphQL', votes: 2 },
  { id: 2, authorId: 2, title: 'Welcome to Meteor', votes: 3 },
  { id: 3, authorId: 2, title: 'Advanced GraphQL', votes: 1 },
  { id: 4, authorId: 3, title: 'Launchpad is Cool', votes: 7 },
];

// Provide resolver functions for your schema fields
const resolvers = {

  Subscription: {
    postUpvoted: {
      // Additional event labels can be passed to asyncIterator creation
      resolve: ({ id }) => {
        const post = find(posts, { id })

        return post;
      },

      subscribe: () => pubsub.asyncIterator([POST_UPVOTED]),
    },
  },

  Query: {
    posts: () => posts,
    post: (_, { id }) => {
      return find(posts, { id })
    },
    author: (_, { id }) => find(authors, { id }),
  },

  Mutation: {
    upvotePost: (_, { postId }) => {
      const post = find(posts, { id: postId });

      if (!post) {
        throw new Error(`Couldn't find post with id ${postId}`);
      }

      post.votes += 1;

      pubsub.publish(POST_UPVOTED, { id: postId });

      return post;
    }
  },

  Author: {
    posts: author => filter(posts, { authorId: author.id }),
  },

  Post: {
    author: post => find(authors, { id: post.authorId }),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  subscriptions: {
    onConnect: () => console.log('Connected to websocket'),
  }
});


const app = express();
const httpServer = http.createServer(app);

server.installSubscriptionHandlers(httpServer);

server.applyMiddleware({ app });

httpServer.listen({ port: 80 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
);
