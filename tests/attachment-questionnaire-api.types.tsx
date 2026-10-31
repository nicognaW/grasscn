import * as React from 'react';
import { Attachment, AttachmentAction, AttachmentTrigger, AttachmentMedia, AttachmentTitle } from '../registry/ui/attachment';
import { Questionnaire, QuestionnaireProgress, QuestionnaireItem, QuestionnaireChoice, QuestionnaireInput, QuestionnairePrevious, QuestionnaireNext, QuestionnaireSubmit, QuestionnaireTitle } from '../registry/ui/questionnaire';
const form = React.createRef<HTMLFormElement>(), input = React.createRef<HTMLInputElement>(), label = React.createRef<HTMLLabelElement>();
<Attachment state="uploading" orientation="vertical"><AttachmentMedia variant="image"><img alt="Custom preview" src="local.png"/></AttachmentMedia><AttachmentTitle><strong>Actual rich title</strong></AttachmentTitle><AttachmentTrigger render={<a href="#preview"/>}>{undefined}</AttachmentTrigger><AttachmentAction render={<a href="#remove"/>}>{"X"}</AttachmentAction></Attachment>;
<Questionnaire ref={form} items={[{ name: 'mode', choices: [{ value: 'one' }] }]} item="mode" onItemChange={name => name.toUpperCase()} shortcuts="numbers" onSubmit={event => new FormData(event.currentTarget)}><QuestionnaireProgress render={(props, state) => <output {...props}>{state.current}/{state.total}</output>}/><QuestionnaireItem name="mode" multiple required><QuestionnaireTitle>World mode</QuestionnaireTitle><QuestionnaireChoice ref={label} value="one" onChange={event => event.currentTarget.checked}>One</QuestionnaireChoice><QuestionnaireInput ref={input} type="password" spellCheck autoCorrect="on" onChange={event => event.currentTarget.value}/></QuestionnaireItem><QuestionnairePrevious /><QuestionnaireNext /><QuestionnaireSubmit /></Questionnaire>;
// @ts-expect-error Vanilla world-entry rows have no small visual variant.
<Attachment size="sm"/>;
// @ts-expect-error The original Button does not have an outline variant.
<QuestionnairePrevious variant="outline"/>;
