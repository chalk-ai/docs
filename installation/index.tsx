import { DocumentationLayout } from '@/layouts/DocumentationLayout'
import { InstallationLayout } from '@/layouts/InstallationLayout'
import { Steps } from '@/components/Steps'
import { ReactNode } from 'react'

interface Code {
  name: string
  lang: string
  code: string
}

interface Step {
  title: string
  body: () => ReactNode
  code: Code | Code[]
}

let steps: Step[] = [
  {
    title: 'Install Chalk',
    body: () => (
      <p>
        Install the <a href={'/cli'}>Chalk command line tool</a>. The Chalk CLI allows you to
        create, update, and manage your feature pipelines directly from your terminal.
      </p>
    ),
    code: {
      name: 'Terminal',
      lang: 'terminal',
      code: 'curl -s -L https://api.chalk.ai/install.sh | sh',
    },
  },
  {
    title: 'Login or sign up',
    body: () => (
      <p>
        Login or signup with Chalk directly from the command line. The{' '}
        <code>
          <a href={'/cli?command=login'}>chalk login</a>
        </code>{' '}
        command will open your browser and create an API token for your local development.
      </p>
    ),
    code: {
      name: 'Terminal',
      lang: 'terminal',
      code: 'chalk login',
    },
  },
  // {
  //   title: 'Create a new project',
  //   body: () => (
  //     <p>
  //       Create a new Chalk project. This command will set up a <code>chalk.yml</code> file where you
  //       can specify configuration.
  //     </p>
  //   ),
  //   code: {
  //     name: 'Terminal',
  //     lang: 'terminal',
  //     code: 'chalk init',
  //   },
  // },
  {
    title: 'Deploy your features',
    body: () => (
      <p>
        Deploy your feature pipeline to production. After you've written some features and
        resolvers, use the{' '}
        <code>
          <a href={'/cli?command=login'}>chalk apply</a>
        </code>{' '}
        command to deploy your feature pipelines.
      </p>
    ),
    code: {
      name: 'Terminal',
      lang: 'terminal',
      code: 'chalk apply',
    },
  },
  {
    title: 'Query your features',
    body: () => (
      <p>
        Query your features directly from the command line with{' '}
        <code>
          <a href={'/cli?command=login'}>chalk query</a>
        </code>{' '}
        to see that they're live and available.
      </p>
    ),
    code: {
      name: 'Terminal',
      lang: 'terminal',
      code: `chalk query --in user.id=1 \\\n    --out user.fraud_score \\\n    --out user.plaid.name_match_score`,
    },
  },
]

export default function ChalkCli({ code }) {
  return (
    <InstallationLayout>
      <div
        id="content-wrapper"
        className="relative z-10 prose prose-zinc mb-8 max-w-3xl dark:prose-dark"
      >
        {/*<h3 className="sr-only">Installing Chalk CLI</h3>*/}
        <p>
          It only takes a few minutes to setup a project with{' '}
          <a href={'/cli?command=login'}>Chalk's command line tool</a>. This guide will walk you through how
          to start a project from a template.
        </p>
      </div>
      <Steps level={4} steps={steps} code={code} />
      {/*
        <Cta
          label="Read the documentation"
          href="/docs/tailwind-cli"
          description={
            <>
              <strong className="text-zinc-900 font-semibold">
                This is only the beginning of what’s possible with the Tailwind CLI.
              </strong>{' '}
              To learn more about everything it can do, check out the Tailwind CLI documentation.
            </>
          }
        />
      */}
    </InstallationLayout>
  )
}

export function getStaticProps() {
  let { highlightCode } = require('../../../../remark/utils')

  return {
    props: {
      code: steps.map(({ code }) => {
        let newCode = Array.isArray(code) ? code : [code]
        newCode = newCode.map((c) => {
          if (c.lang && c.lang !== 'terminal') {
            return highlightCode(c.code, c.lang)
          }
          return c.code
        })
        return Array.isArray(code) ? newCode : newCode[0]
      }),
    },
  }
}

ChalkCli.layoutProps = {
  meta: {
    title: 'Installation',
  },
  Layout: DocumentationLayout,
  allowOverflow: false,
}
