import { DocumentationLayout } from '@/layouts/DocumentationLayout'
import { ClientLibraries, CloneSampleRepo, HighlightsGrid } from '@/components/HighlightsGrid'
import { OverviewLayout } from '@/layouts/OverviewLayout'

export default function OverviewPage({ code }) {
  return (
    <OverviewLayout>
      <HighlightsGrid
        title={'Core Concepts'}
        links={[
          {
            href: '/docs/what-is-chalk',
            name: 'Chalk',
            description: 'See an overview of Chalk.',
          },
          {
            href: '/docs/features',
            name: 'Features',
            description: 'Define features for training and inference.',
          },
          {
            href: '/docs/resolver-overview',
            name: 'Resolvers',
            description: 'Create resolvers to compute feature values.',
          },
          {
            href: '/docs/query-basics',
            name: 'Query',
            description: 'Fetch feature values via online query.',
          },
        ]}
      />

      <HighlightsGrid
        title={'Guides'}
        links={[
          {
            href: '/docs/lifecycle',
            name: 'Create a new feature',
            description: 'Create and backfill a new feature.',
          },
          {
            href: '/docs/branches',
            name: 'Deploy to a branch',
            description: 'Deploy your code to an ephemeral branch in <100ms.',
          },
          {
            href: '/docs/backfilling-data',
            name: 'Backfilling',
            description: 'Batch ingest historical feature data from bulk data sources.',
          },
          {
            href: '/docs/feature-version-tutorial',
            name: 'Version a feature',
            description: 'Create an explicit new version of a feature.',
          },
        ]}
      />

      <CloneSampleRepo
        projects={[
          {
            title: 'Marketplaces',
            repo: 'https://github.com/chalk-ai/',
            description: 'Example carshare application for search and risk',
          },
          {
            title: 'Fraud',
            repo: 'https://github.com/chalk-ai/fraud-example',
            description: 'Build a feature pipeline for fraud detection.',
          },
          {
            title: 'Code Snippets',
            repo: 'https://github.com/chalk-ai/examples',
            description: 'Small, curated examples and patterns for using Chalk.',
          },
        ]}
      />

      <ClientLibraries />
    </OverviewLayout>
  )
}

OverviewPage.layoutProps = {
  meta: {
    title: 'Docs',
  },
  Layout: DocumentationLayout,
  allowOverflow: true,
}
