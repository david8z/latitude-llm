import Scope from '$compiler/compiler/scope'
import { TemplateNode } from '$compiler/parser/interfaces'
import { Message, MessageContent } from '$compiler/types'
import type { Node as LogicalExpression } from 'estree'

import { ResolveBaseNodeProps, ToolCallReference } from '../types'

export enum NodeType {
  Literal = 'Literal',
  Identifier = 'Identifier',
  ObjectExpression = 'ObjectExpression',
  ArrayExpression = 'ArrayExpression',
  SequenceExpression = 'SequenceExpression',
  LogicalExpression = 'LogicalExpression',
  BinaryExpression = 'BinaryExpression',
  UnaryExpression = 'UnaryExpression',
  AssignmentExpression = 'AssignmentExpression',
  UpdateExpression = 'UpdateExpression',
  MemberExpression = 'MemberExpression',
  ConditionalExpression = 'ConditionalExpression',
  CallExpression = 'CallExpression',
  ChainExpression = 'ChainExpression',
}

type RaiseErrorFn<T = void | never, N = TemplateNode | LogicalExpression> = (
  { code, message }: { code: string; message: string },
  node: N,
) => T

export type CompileNodeContext<N extends TemplateNode> = {
  node: N
  scope: Scope
  resolveExpression: (
    expression: LogicalExpression,
    scope: Scope,
  ) => Promise<unknown>
  resolveBaseNode: (props: ResolveBaseNodeProps<TemplateNode>) => Promise<void>
  baseNodeError: RaiseErrorFn<never, TemplateNode>
  expressionError: RaiseErrorFn<never, LogicalExpression>

  isInsideMessageTag: boolean
  isInsideContentTag: boolean

  addMessage: (message: Message) => void
  addStrayText: (text: string) => void
  popStrayText: () => string
  groupStrayText: () => void
  addContent: (content: MessageContent) => void
  popContent: () => MessageContent[]
  groupContent: () => void
  addToolCall: (toolCallRef: ToolCallReference) => void
  popToolCalls: () => ToolCallReference[]
}