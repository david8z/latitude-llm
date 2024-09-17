import { ContentType, MessageRole } from '@latitude-data/compiler'
import { v4 as uuid } from 'uuid'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  Commit,
  DocumentVersion,
  LogSources,
  ProviderApiKey,
  ProviderLog,
  Providers,
  User,
  Workspace,
} from '../../../browser'
import {
  createDocumentLog,
  createProject,
  createProviderApiKey,
} from '../../../tests/factories'
import { testConsumeStream } from '../../../tests/helpers'
import { addMessages } from './index'

const mocks = vi.hoisted(() => {
  return {
    runAi: vi.fn(async () => {
      const fullStream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: 'text-delta',
            textDelta: 'AI gener',
          })
          controller.enqueue({
            type: 'text-delta',
            textDelta: 'ated text',
          })

          controller.close()
        },
      })
      return {
        text: Promise.resolve('Fake AI generated text'),
        usage: Promise.resolve({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        }),
        toolCalls: Promise.resolve([]),
        fullStream,
      }
    }),
  }
})

vi.mock('../../ai', async (importMod) => {
  const mod = (await importMod()) as typeof import('../../ai')
  return {
    ...mod,
    ai: mocks.runAi,
  }
})

const dummyDoc1Content = `
---
provider: openai
model: gpt-4o
---

This is a test document
<response />
`

let document: DocumentVersion
let commit: Commit
let workspace: Workspace
let user: User
let providerApiKey: ProviderApiKey
let providerLog: ProviderLog

async function buildData({
  doc1Content = dummyDoc1Content,
}: { doc1Content?: string } = {}) {
  const {
    workspace: wsp,
    documents,
    commit: cmt,
    user: usr,
  } = await createProject({
    documents: {
      doc1: doc1Content,
    },
  })
  document = documents.find((d) => d.path === 'doc1')!
  commit = cmt
  workspace = wsp
  user = usr
  providerApiKey = await createProviderApiKey({
    workspace,
    type: Providers.OpenAI,
    name: 'openai',
    user,
  })
  const { providerLogs } = await createDocumentLog({
    commit,
    document,
  })
  return {
    providerApiKey,
    workspace,
    document,
    commit,
    user,
    providerLog: providerLogs[providerLogs.length - 1]!,
  }
}

describe('addMessages', () => {
  beforeEach(async () => {
    vi.resetModules()
    const {
      workspace: wsp,
      user: usr,
      document: doc,
      commit: cmt,
      providerLog: pl,
    } = await buildData({
      doc1Content: dummyDoc1Content,
    })
    user = usr
    document = doc
    commit = cmt
    workspace = wsp
    providerLog = pl
  })

  it('fails if provider log is not found', async () => {
    const result = await addMessages({
      workspace,
      documentLogUuid: uuid(),
      messages: [],
      source: LogSources.API,
    })

    expect(result.error).toBeDefined()
  })

  it('pass arguments to AI service', async () => {
    const { addMessages } = await import('./index')
    const { stream } = await addMessages({
      workspace,
      documentLogUuid: providerLog.documentLogUuid!,
      messages: [
        {
          role: MessageRole.user,
          content: [
            {
              type: ContentType.text,
              text: 'This is a user message',
            },
          ],
        },
      ],
      source: LogSources.API,
    }).then((r) => r.unwrap())

    await testConsumeStream(stream)

    expect(mocks.runAi).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          ...providerLog.messages,
          {
            role: MessageRole.assistant,
            content: providerLog.responseText,
            toolCalls: providerLog.toolCalls,
          },
          {
            role: MessageRole.user,
            content: [
              {
                type: ContentType.text,
                text: 'This is a user message',
              },
            ],
          },
        ]),
        config: expect.objectContaining({
          model: 'gpt-4o',
          provider: 'openai',
        }),
        provider: expect.any(Object),
        documentLogUuid: providerLog.documentLogUuid!,
      }),
    )
  })

  it('send documentLogUuid when chain is completed', async () => {
    const { addMessages } = await import('./index')
    const { stream } = await addMessages({
      workspace,
      documentLogUuid: providerLog.documentLogUuid!,
      messages: [
        {
          role: MessageRole.user,
          content: [
            {
              type: ContentType.text,
              text: 'This is a user message',
            },
          ],
        },
      ],
      source: LogSources.API,
    }).then((r) => r.unwrap())
    const { value } = await testConsumeStream(stream)

    expect(value).toEqual([
      {
        event: 'provider-event',
        data: { type: 'text-delta', textDelta: 'AI gener' },
      },
      {
        event: 'provider-event',
        data: { type: 'text-delta', textDelta: 'ated text' },
      },
      {
        event: 'latitude-event',
        data: {
          type: 'chain-complete',
          config: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          messages: [
            {
              role: 'assistant',
              content: 'Fake AI generated text',
              toolCalls: [],
            },
          ],
          response: {
            text: 'Fake AI generated text',
            toolCalls: [],
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            documentLogUuid: providerLog.documentLogUuid!,
          },
        },
      },
    ])
  })
})
