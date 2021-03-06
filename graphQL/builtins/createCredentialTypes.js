import {
  GraphQLEnumType,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import Qs from 'qs';
import Url from 'url';
import { pick, isEqual } from 'lodash';

import { UserError } from '../UserError';
import TypeSet from '../TypeSet';

function getBaseCredentialFields(providerName) {
  return {
    accessToken: {
      type: GraphQLString,
      description: `The OAuth access token obtained for the ${providerName} ` +
        'user during authentication.',
    },
    displayName: {
      type: GraphQLString,
      description: `The ${providerName} user's full name.`,
    },
    id: {
      type: GraphQLString,
      description: `The ${providerName} user's ID.`,
      metadata: {
        unique: true,
      },
    },
  };
}

export default function createCredentialTypes() {
  const ReindexAuth0Credential = new GraphQLObjectType({
    name: 'ReindexAuth0Credential',
    description: 'Auth0 user profile.',
    fields: {
      ...getBaseCredentialFields('Auth0'),
      email: {
        type: GraphQLString,
        description: 'The email address stored in the Auth0 user profile.',
      },
      picture: {
        type: GraphQLString,
        description: `The URL of the person's profile picture.`,
      },
    },
  });
  const ReindexGithubCredential = new GraphQLObjectType({
    name: 'ReindexGithubCredential',
    description: 'GitHub authentication credentials.',
    fields: {
      ...getBaseCredentialFields('GitHub'),
      email: {
        type: GraphQLString,
        description: 'The GitHub user\'s (public) email address.',
      },
      picture: {
        type: GraphQLString,
        description: `The URL of the person's profile picture.`,
      },
      username: {
        type: GraphQLString,
        description: 'The user\'s GitHub username.',
      },
    },
  });
  const ReindexFacebookCredential = new GraphQLObjectType({
    name: 'ReindexFacebookCredential',
    description: 'Facebook authentication credentials.',
    fields: {
      ...getBaseCredentialFields('Facebook'),
      email: {
        type: GraphQLString,
        description: 'The Facebook user\'s email address.',
      },
      picture: {
        type: GraphQLString,
        description: `The URL of the person's profile picture.`,
        args: {
          height: {
            type: GraphQLInt,
            description: 'The height of this picture in pixels.',
          },
          width: {
            type: GraphQLInt,
            description: 'The width of this picture in pixels.',
          },
        },
        metadata: {
          computed: true,
        },
        resolve(parent, args) {
          let url = `https://graph.facebook.com/v2.3/${parent.id}/picture`;
          const queryString = Qs.stringify(
            pick(args, 'width', 'height'),
            { skipNulls: true }
          );
          if (queryString) {
            url += '?' + queryString;
          }
          return url;
        },
      },
    },
  });
  const ReindexGoogleCredential = new GraphQLObjectType({
    name: 'ReindexGoogleCredential',
    description: 'Google authentication credentials.',
    fields: {
      ...getBaseCredentialFields('Google'),
      email: {
        type: GraphQLString,
        description: 'Google account email address.',
      },
      picture: {
        type: GraphQLString,
        description: `The URL of the person's profile picture.`,
        args: {
          size: {
            type: GraphQLInt,
            description: 'Dimension of each side in pixels. If given, the ' +
              'image will be resized and cropped to a square.',
          },
        },
        resolve(parent, args) {
          const url = parent.picture;
          if (!url) {
            return null;
          }
          const urlObject = Url.parse(url, true);
          if (args.size) {
            urlObject.query.sz = args.size;
          } else {
            delete urlObject.query.sz;
          }
          delete urlObject.search;
          return Url.format(urlObject);
        },
      },
    },
  });
  const ReindexTwitterPictureSize = new GraphQLEnumType({
    name: 'ReindexTwitterPictureSize',
    description: 'Size variant of a Twitter profile picture.',
    values: {
      normal: {
        description: '48px by 48px',
      },
      bigger: {
        description: '73px by 73px',
      },
      mini: {
        description: '24px by 24px',
      },
      original: {
        description: 'Original size',
      },
    },
  });
  const ReindexTwitterCredential = new GraphQLObjectType({
    name: 'ReindexTwitterCredential',
    description: 'Twitter authentication credentials.',
    fields: {
      ...getBaseCredentialFields('Twitter'),
      accessTokenSecret: {
        type: GraphQLString,
        description: 'The OAuth token secret obtained for the Twitter user ' +
          'during authentication.',
      },
      picture: {
        type: GraphQLString,
        description: `The URL of the person's profile picture.`,
        args: {
          size: {
            type: ReindexTwitterPictureSize,
            description: 'Size of the profile picture.',
            defaultValue: 'original',
          },
        },
        resolve(parent, args) {
          const url = parent.picture;
          if (!url) {
            return null;
          }
          if (args.size === 'original') {
            return url.replace(/_normal\./, '.');
          } else {
            return url.replace(/_normal\./, '_' + args.size + '.');
          }
        },
      },
      username: {
        type: GraphQLString,
        description: 'The user\'s Twitter screen name.',
      },
    },
  });

  const createCredentialResolve = (provider) => (
    (parent, args, context) => {
      const credentials = context.credentials;
      if (credentials.isAdmin ||
          isEqual(credentials.userID, parent.__node.id)) {
        return parent[provider];
      } else {
        throw new UserError(
          `User lacks permissions to read nodes of type \`User\` with fields ` +
          `\`credentials.${provider}\`.`
        );
      }
    }
  );

  const ReindexCredentialCollection = new GraphQLObjectType({
    name: 'ReindexCredentialCollection',
    description:
      'The credentials of the user in different authentication services.',
    fields: {
      auth0: {
        type: ReindexAuth0Credential,
        description: 'The Auth0 user profile of the authenticated user.',
        resolve: createCredentialResolve('auth0'),
      },
      facebook: {
        type: ReindexFacebookCredential,
        description: 'The Facebook credentials of the authenticated user.',
        resolve: createCredentialResolve('facebook'),
      },
      github: {
        type: ReindexGithubCredential,
        description: 'The GitHub credentials of the authenticated user.',
        resolve: createCredentialResolve('github'),
      },
      google: {
        type: ReindexGoogleCredential,
        description: 'The Google credentials of the authenticated user.',
        resolve: createCredentialResolve('google'),
      },
      twitter: {
        type: ReindexTwitterCredential,
        description: 'The Twitter credentials of the authenticated user.',
        resolve: createCredentialResolve('twitter'),
      },
    },
  });

  return [
    new TypeSet({
      type: ReindexCredentialCollection,
    }),
    new TypeSet({
      type: ReindexAuth0Credential,
    }),
    new TypeSet({
      type: ReindexFacebookCredential,
    }),
    new TypeSet({
      type: ReindexGithubCredential,
    }),
    new TypeSet({
      type: ReindexGoogleCredential,
    }),
    new TypeSet({
      type: ReindexTwitterCredential,
    }),
  ];
}
