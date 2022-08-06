import { arg, extendType, inputObjectType, nonNull, objectType, stringArg } from 'nexus';
import { NexusGenObjects } from '../../nexus-typegen';
import { Context } from '../context';
import { graphqlPhotographer, sortPhotographers, validFullName } from '../utilities/photographer';
import { validSlug, validUrl } from '../utilities/utilities';
import { Exhibition } from './Exhibition';

export const Photographer = objectType({
  name: 'Photographer',
  definition(t) {
    t.nonNull.int('id');
    t.field('createdAt', { type: nonNull('Date') });
    t.field('updatedAt', { type: nonNull('Date') });
    t.string('firstName');
    t.string('lastName');
    t.string('otherNames');
    t.string('name');
    t.nonNull.string('slug');
    t.list.nonNull.field('exhibitions', { type: Exhibition });
    t.string('website');
    t.string('websiteUrl');
  },
});

export const CreatePhotographerInput = inputObjectType({
  name: 'CreatePhotographerInput',
  definition(t) {
    t.string('firstName');
    t.string('otherNames');
    t.string('lastName');
    t.nonNull.string('slug');
    t.string('website');
  },
});

export const PaginatedPhotographers = objectType({
  name: 'PaginatedPhotographers',
  definition(t) {
    t.list.field('photographers', { type: nonNull('Photographer') });
    t.boolean('hasMore');
  },
});

export const PhotographerQueryResponse = objectType({
  name: 'PhotographerQueryResponse',
  definition(t) {
    t.field('photographer', { type: nonNull('Photographer') });
    t.string('error');
  },
});

export const CreatePhotographerResponse = objectType({
  name: 'CreatePhotographerResponse',
  definition(t) {
    t.field('photographer', { type: nonNull('Photographer') });
    t.field('errors', { type: nonNull('FieldError') });
  },
});

export const PhotographerQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('photographer', {
      type: PhotographerQueryResponse,
      args: { slug: nonNull(stringArg()) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { slug } = args;
          const photographer = await ctx.db.photographer.findUnique({
            where: { slug },
            include: {
              exhibitions: true,
            },
          });

          if (!photographer) {
            return { error: 'No photographer found with that slug' };
          }
          return { photographer: graphqlPhotographer(photographer) };
        } catch (error) {
          console.error('Error in galleries Query resolver');
          return { galleries: [], hasMore: false };
        }
      },
    }),
      t.nonNull.field('photographers', {
        type: PaginatedPhotographers,
        args: {},
        async resolve(_root, _args, ctx: Context) {
          try {
            const photographers =
              (await ctx.db.photographer.findMany({
                take: 100,
                include: {
                  exhibitions: true,
                },
              })) ?? {};

            return {
              photographers: sortPhotographers(photographers).map((element) =>
                graphqlPhotographer(element),
              ),
              hasMore: false,
            };
          } catch (error) {
            console.error('Error in galleries Query resolver');
            return { galleries: [], hasMore: false };
          }
        },
      });
  },
});

export const PhotographerMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createPhotographer', {
      type: CreatePhotographerResponse,
      args: { input: arg({ type: nonNull(CreatePhotographerInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { user } = ctx.session;
          const { input } = args;

          if (!user) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }
          const { mfaAuthenticated, userId } = user;
          if (!userId || !mfaAuthenticated) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }
          const {
            firstName: untrimmedFirstName,
            lastName: untrimmedLastName,
            otherNames: untrimmedOtherNames,
            slug,
            website,
          } = input;

          const firstName = untrimmedFirstName?.trim();
          const otherNames = untrimmedOtherNames?.trim();
          const lastName = untrimmedLastName?.trim();

          const errors: NexusGenObjects['FieldError'][] = [];

          // check photographer does not already exist
          const existingPhotographer = await ctx.db.photographer.findUnique({
            where: { slug },
          });
          if (existingPhotographer) {
            errors.push({
              field: 'slug',
              message: 'There is already a photographer with that slug.',
            });
          }
          errors.push(...validFullName({ firstName, otherNames, lastName }));
          errors.push(...validSlug(slug, 'slug'));
          website && errors.push(...validUrl(website, 'website'));

          if (errors.length > 0) {
            return { errors };
          }
          // create new photographer
          const photographer = await ctx.db.photographer.create({
            data: {
              createdBy: { connect: { uid: userId } },
              ...(firstName ? { firstName } : {}),
              ...(otherNames ? { otherNames } : {}),
              ...(lastName ? { lastName } : {}),
              slug,
              website,
            },
            include: {
              exhibitions: true,
            },
          });
          return { photographer: graphqlPhotographer(photographer) };
        } catch (error: unknown) {
          console.error('Error creating new photographer');
          return { errors: [{ field: 'unknown', message: error as string }] };
        }
      },
    });
  },
});
