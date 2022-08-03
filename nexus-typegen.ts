/**
 * This file was generated by Nexus Schema
 * Do not make changes to this file directly
 */

import type { Context } from './src/context';
import type { core } from 'nexus';
declare global {
  interface NexusGenCustomInputMethods<TypeName extends string> {
    /**
     * A date string, such as 2007-12-03, compliant with the `full-date` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
     */
    date<FieldName extends string>(
      fieldName: FieldName,
      opts?: core.CommonInputFieldConfig<TypeName, FieldName>,
    ): void; // "Date";
  }
}
declare global {
  interface NexusGenCustomOutputMethods<TypeName extends string> {
    /**
     * A date string, such as 2007-12-03, compliant with the `full-date` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
     */
    date<FieldName extends string>(
      fieldName: FieldName,
      ...opts: core.ScalarOutSpread<TypeName, FieldName>
    ): void; // "Date";
  }
}

declare global {
  interface NexusGen extends NexusGenTypes {}
}

export interface NexusGenInputs {
  CreateExhibitionInput: {
    // input type
    bodyText?: string | null; // String
    description: string; // String!
    end: string; // String!
    freeEntry: boolean; // Boolean!
    gallery: string; // String!
    hashtags: string[]; // [String!]!
    inPerson: boolean; // Boolean!
    name: string; // String!
    online: boolean; // Boolean!
    start: string; // String!
    summaryText: string; // String!
    url?: string | null; // String
  };
  UpdateExhibitionInput: {
    // input type
    addPhotographers: string[]; // [String!]!
    bodyText?: string | null; // String
    id: string; // String!
    name?: string | null; // String
    removePhotographers: string[]; // [String!]!
    summaryText?: string | null; // String
    url?: string | null; // String
  };
}

export interface NexusGenEnums {}

export interface NexusGenScalars {
  String: string;
  Int: number;
  Float: number;
  Boolean: boolean;
  ID: string;
  Date: Date;
}

export interface NexusGenObjects {
  CreateExhibitionResponse: {
    // root type
    errors?: Array<NexusGenRootTypes['FieldError'] | null> | null; // [FieldError]
    exhibition?: NexusGenRootTypes['Exhibition'] | null; // Exhibition
  };
  Exhibition: {
    // root type
    bodyText?: string | null; // String
    createdAt?: string | null; // String
    description?: string | null; // String
    end?: string | null; // String
    freeEntry?: boolean | null; // Boolean
    gallery?: NexusGenRootTypes['Gallery'] | null; // Gallery
    hashtags: string[]; // [String!]!
    id: string; // String!
    inPerson?: boolean | null; // Boolean
    name: string; // String!
    online?: boolean | null; // Boolean
    photographers?: NexusGenRootTypes['Photographer'][] | null; // [Photographer!]
    start?: string | null; // String
    summaryText?: string | null; // String
    updatedAt?: string | null; // String
    url?: string | null; // String
  };
  ExhibitionQueryResponse: {
    // root type
    error?: string | null; // String
    exhibition?: NexusGenRootTypes['Exhibition'] | null; // Exhibition
  };
  FieldError: {
    // root type
    field: string; // String!
    message: string; // String!
  };
  Gallery: {
    // root type
    id: string; // String!
  };
  Mutation: {};
  PaginatedExhibitions: {
    // root type
    exhibitions?: Array<NexusGenRootTypes['Exhibition'] | null> | null; // [Exhibition]
    hasMore?: boolean | null; // Boolean
  };
  Photographer: {
    // root type
    createdAt: NexusGenScalars['Date']; // Date!
    exhibitions?: NexusGenRootTypes['Exhibition'][] | null; // [Exhibition!]
    firstName?: string | null; // String
    id: number; // Int!
    lastName?: string | null; // String
    name?: string | null; // String
    otherNames?: string | null; // String
    slug: string; // String!
    updatedAt: NexusGenScalars['Date']; // Date!
    website?: string | null; // String
    websiteUrl?: string | null; // String
  };
  Query: {};
}

export interface NexusGenInterfaces {}

export interface NexusGenUnions {}

export type NexusGenRootTypes = NexusGenObjects;

export type NexusGenAllTypes = NexusGenRootTypes & NexusGenScalars;

export interface NexusGenFieldTypes {
  CreateExhibitionResponse: {
    // field return type
    errors: Array<NexusGenRootTypes['FieldError'] | null> | null; // [FieldError]
    exhibition: NexusGenRootTypes['Exhibition'] | null; // Exhibition
  };
  Exhibition: {
    // field return type
    bodyText: string | null; // String
    createdAt: string | null; // String
    description: string | null; // String
    end: string | null; // String
    freeEntry: boolean | null; // Boolean
    gallery: NexusGenRootTypes['Gallery'] | null; // Gallery
    hashtags: string[]; // [String!]!
    id: string; // String!
    inPerson: boolean | null; // Boolean
    name: string; // String!
    online: boolean | null; // Boolean
    photographers: NexusGenRootTypes['Photographer'][] | null; // [Photographer!]
    start: string | null; // String
    summaryText: string | null; // String
    updatedAt: string | null; // String
    url: string | null; // String
  };
  ExhibitionQueryResponse: {
    // field return type
    error: string | null; // String
    exhibition: NexusGenRootTypes['Exhibition'] | null; // Exhibition
  };
  FieldError: {
    // field return type
    field: string; // String!
    message: string; // String!
  };
  Gallery: {
    // field return type
    id: string; // String!
  };
  Mutation: {
    // field return type
    createExhibition: NexusGenRootTypes['CreateExhibitionResponse']; // CreateExhibitionResponse!
    updateExhibition: NexusGenRootTypes['CreateExhibitionResponse']; // CreateExhibitionResponse!
  };
  PaginatedExhibitions: {
    // field return type
    exhibitions: Array<NexusGenRootTypes['Exhibition'] | null> | null; // [Exhibition]
    hasMore: boolean | null; // Boolean
  };
  Photographer: {
    // field return type
    createdAt: NexusGenScalars['Date']; // Date!
    exhibitions: NexusGenRootTypes['Exhibition'][] | null; // [Exhibition!]
    firstName: string | null; // String
    id: number; // Int!
    lastName: string | null; // String
    name: string | null; // String
    otherNames: string | null; // String
    slug: string; // String!
    updatedAt: NexusGenScalars['Date']; // Date!
    website: string | null; // String
    websiteUrl: string | null; // String
  };
  Query: {
    // field return type
    exhibition: NexusGenRootTypes['ExhibitionQueryResponse']; // ExhibitionQueryResponse!
    exhibitions: NexusGenRootTypes['PaginatedExhibitions']; // PaginatedExhibitions!
    hello: string | null; // String
  };
}

export interface NexusGenFieldTypeNames {
  CreateExhibitionResponse: {
    // field return type name
    errors: 'FieldError';
    exhibition: 'Exhibition';
  };
  Exhibition: {
    // field return type name
    bodyText: 'String';
    createdAt: 'String';
    description: 'String';
    end: 'String';
    freeEntry: 'Boolean';
    gallery: 'Gallery';
    hashtags: 'String';
    id: 'String';
    inPerson: 'Boolean';
    name: 'String';
    online: 'Boolean';
    photographers: 'Photographer';
    start: 'String';
    summaryText: 'String';
    updatedAt: 'String';
    url: 'String';
  };
  ExhibitionQueryResponse: {
    // field return type name
    error: 'String';
    exhibition: 'Exhibition';
  };
  FieldError: {
    // field return type name
    field: 'String';
    message: 'String';
  };
  Gallery: {
    // field return type name
    id: 'String';
  };
  Mutation: {
    // field return type name
    createExhibition: 'CreateExhibitionResponse';
    updateExhibition: 'CreateExhibitionResponse';
  };
  PaginatedExhibitions: {
    // field return type name
    exhibitions: 'Exhibition';
    hasMore: 'Boolean';
  };
  Photographer: {
    // field return type name
    createdAt: 'Date';
    exhibitions: 'Exhibition';
    firstName: 'String';
    id: 'Int';
    lastName: 'String';
    name: 'String';
    otherNames: 'String';
    slug: 'String';
    updatedAt: 'Date';
    website: 'String';
    websiteUrl: 'String';
  };
  Query: {
    // field return type name
    exhibition: 'ExhibitionQueryResponse';
    exhibitions: 'PaginatedExhibitions';
    hello: 'String';
  };
}

export interface NexusGenArgTypes {
  Mutation: {
    createExhibition: {
      // args
      input: NexusGenInputs['CreateExhibitionInput']; // CreateExhibitionInput!
    };
    updateExhibition: {
      // args
      input: NexusGenInputs['UpdateExhibitionInput']; // UpdateExhibitionInput!
    };
  };
  Query: {
    exhibition: {
      // args
      id: string; // String!
    };
  };
}

export interface NexusGenAbstractTypeMembers {}

export interface NexusGenTypeInterfaces {}

export type NexusGenObjectNames = keyof NexusGenObjects;

export type NexusGenInputNames = keyof NexusGenInputs;

export type NexusGenEnumNames = never;

export type NexusGenInterfaceNames = never;

export type NexusGenScalarNames = keyof NexusGenScalars;

export type NexusGenUnionNames = never;

export type NexusGenObjectsUsingAbstractStrategyIsTypeOf = never;

export type NexusGenAbstractsUsingStrategyResolveType = never;

export type NexusGenFeaturesConfig = {
  abstractTypeStrategies: {
    isTypeOf: false;
    resolveType: true;
    __typename: false;
  };
};

export interface NexusGenTypes {
  context: Context;
  inputTypes: NexusGenInputs;
  rootTypes: NexusGenRootTypes;
  inputTypeShapes: NexusGenInputs & NexusGenEnums & NexusGenScalars;
  argTypes: NexusGenArgTypes;
  fieldTypes: NexusGenFieldTypes;
  fieldTypeNames: NexusGenFieldTypeNames;
  allTypes: NexusGenAllTypes;
  typeInterfaces: NexusGenTypeInterfaces;
  objectNames: NexusGenObjectNames;
  inputNames: NexusGenInputNames;
  enumNames: NexusGenEnumNames;
  interfaceNames: NexusGenInterfaceNames;
  scalarNames: NexusGenScalarNames;
  unionNames: NexusGenUnionNames;
  allInputTypes:
    | NexusGenTypes['inputNames']
    | NexusGenTypes['enumNames']
    | NexusGenTypes['scalarNames'];
  allOutputTypes:
    | NexusGenTypes['objectNames']
    | NexusGenTypes['enumNames']
    | NexusGenTypes['unionNames']
    | NexusGenTypes['interfaceNames']
    | NexusGenTypes['scalarNames'];
  allNamedTypes: NexusGenTypes['allInputTypes'] | NexusGenTypes['allOutputTypes'];
  abstractTypes: NexusGenTypes['interfaceNames'] | NexusGenTypes['unionNames'];
  abstractTypeMembers: NexusGenAbstractTypeMembers;
  objectsUsingAbstractStrategyIsTypeOf: NexusGenObjectsUsingAbstractStrategyIsTypeOf;
  abstractsUsingStrategyResolveType: NexusGenAbstractsUsingStrategyResolveType;
  features: NexusGenFeaturesConfig;
}

declare global {
  interface NexusGenPluginTypeConfig<TypeName extends string> {}
  interface NexusGenPluginInputTypeConfig<TypeName extends string> {}
  interface NexusGenPluginFieldConfig<TypeName extends string, FieldName extends string> {}
  interface NexusGenPluginInputFieldConfig<TypeName extends string, FieldName extends string> {}
  interface NexusGenPluginSchemaConfig {}
  interface NexusGenPluginArgConfig {}
}
