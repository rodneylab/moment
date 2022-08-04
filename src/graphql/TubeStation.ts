import { arg, extendType, inputObjectType, list, nonNull, objectType, stringArg } from 'nexus';
import { NexusGenObjects } from '../../nexus-typegen';
import { Context } from '../context';
import { graphqlTubeStation, validName } from '../utilities/tubeStation';
import { validSlug } from '../utilities/utilities';

export const TubeStation = objectType({
  name: 'TubeStation',
  definition(t) {
    t.nonNull.int('id');
    t.field('createdAt', { type: nonNull('Date') });
    t.field('updatedAt', { type: nonNull('Date') });
    t.nonNull.string('name');
    t.nonNull.string('slug');
    t.nonNull.list.nonNull.field('galleries', { type: nonNull('Gallery') });
  },
});

export const CreateTubeStationInput = inputObjectType({
  name: 'CreateTubeStationInput',
  definition(t) {
    t.nonNull.string('name');
    t.nonNull.string('slug');
  },
});

export const UpdateTubeStationInput = inputObjectType({
  name: 'UpdateTubeStationInput',
  definition(t) {
    t.nonNull.string('id');
    t.string('name');
    t.string('slug');
  },
});

export const CreateTubeStationResponse = objectType({
  name: 'CreateTubeStationResponse',
  definition(t) {
    t.field('tubeStation', { type: nonNull('TubeStation') });
    t.list.field('errors', { type: nonNull('FieldError') });
  },
});

export const TubeStationQueryResponse = objectType({
  name: 'TubeStationQueryResponse',
  definition(t) {
    t.field('tubeStation', { type: nonNull('TubeStation') });
    t.string('error');
  },
});

export const TubeStationQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('tubeStation', {
      type: TubeStationQueryResponse,
      args: { slug: nonNull(stringArg()) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { slug } = args;
          const tubeStation = await ctx.prisma.tubeStation.findUnique({
            where: { slug },
          });

          if (!tubeStation) {
            return { error: 'No tube station found with that slug' };
          }
          return { tubeStation: graphqlTubeStation(tubeStation) };
        } catch (error) {
          console.error('Error in galleries Query resolver');
          return { galleries: [], hasMore: false };
        }
      },
    }),
      t.nonNull.field('tubeStations', {
        type: list(TubeStation),
        args: {},
        async resolve(_root, _args, ctx: Context) {
          try {
            const tubeStations = await ctx.prisma.tubeStation.findMany({
              take: 999,
              orderBy: { name: 'asc' },
            });
            return tubeStations.map((element) => graphqlTubeStation(element));
          } catch (error) {
            console.error('Unknown error running tubeStations query');
            return [];
          }
        },
      });
  },
});

export const TubeStationMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createTubeStation', {
      type: CreateTubeStationResponse,
      args: { input: arg({ type: nonNull(CreateTubeStationInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { user } = ctx.request.session;
          const { input } = args;

          if (!user) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }
          const { mfaAuthenticated, userId } = user;
          if (!userId || !mfaAuthenticated) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }

          const { name, slug } = input;

          const errors: NexusGenObjects['FieldError'][] = [];
          errors.push(...validName(name, 'name'));
          errors.push(...validSlug(slug, 'slug'));
          if (errors.length !== 0) {
            return { errors };
          }

          const existingTubeStation = await ctx.prisma.tubeStation.findFirst({
            where: { OR: [{ name }, { slug }] },
          });
          if (existingTubeStation) {
            if (existingTubeStation.name === name) {
              return {
                errors: [
                  { field: 'name', message: 'There is already a tube station with that name.' },
                ],
              };
            } else {
              return {
                errors: [
                  { field: 'slug', message: 'There is already a tube station with that slug.' },
                ],
              };
            }
          }

          const tubeStation = await ctx.prisma.tubeStation.create({
            data: { name, slug },
          });
          return { tubeStation: graphqlTubeStation(tubeStation) };
        } catch (error: unknown) {
          console.error('Error creating new tubeStation');
          return { errors: [{ field: 'unknown', message: error as string }] };
        }
      },
    });
    t.nonNull.boolean('deleteTubeStation', {
      args: { id: nonNull(stringArg()) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { user } = ctx.request.session;
          const { id } = args;

          if (!user) {
            return false;
          }
          const { mfaAuthenticated, userId } = user;
          if (!userId || !mfaAuthenticated) {
            return false;
          }

          // todo(rodneylab): check relations and only allow deletions if it makes sense
          const tubeStation = await ctx.prisma.tubeStation.findUnique({ where: { uid: id } });
          if (!tubeStation) {
            return false;
          }
          const { id: tubeStationId } = tubeStation;
          await ctx.prisma.galleryTubeStations.deleteMany({
            where: { tubeStationId },
          });
          await ctx.prisma.tubeStation.delete({ where: { id: tubeStationId } });
          return true;
        } catch (error: unknown) {
          const { id } = args;
          console.error(`Error deleting tubeStation ${id}: ${error as string}`);
          return false;
        }
      },
    });
    t.nonNull.field('updateTubeStation', {
      type: CreateTubeStationResponse,
      args: { input: arg({ type: nonNull(UpdateTubeStationInput) }) },
      async resolve(_root, args, ctx: Context) {
        try {
          const { user } = ctx.request.session;
          const { input } = args;

          if (!user) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }
          const { mfaAuthenticated, userId } = user;
          if (!userId || !mfaAuthenticated) {
            return { errors: [{ field: 'user', message: 'Please sign in and try again' }] };
          }

          const { id: uid } = input;
          const tubeStation = await ctx.prisma.tubeStation.findUnique({
            where: { uid },
          });
          if (!tubeStation) {
            return {
              errors: [{ field: 'id', message: `Wasn't able to find a tube station with that id` }],
            };
          }
          const { name, slug } = input;
          const updatedTubeStation = await ctx.prisma.tubeStation.update({
            where: {
              uid,
            },
            data: {
              ...(name ? { name } : {}),
              ...(slug ? { slug } : {}),
            },
          });
          return { tubeStation: graphqlTubeStation(updatedTubeStation) };
        } catch (error: unknown) {
          const { input } = args;
          console.error(`Error updating tube station ${input.id}: ${error as string}`);
          return { errors: [{ field: 'unknown', message: error as string }] };
        }
      },
    });
  },
});
