import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, fn, userEvent, within } from 'storybook/test';

import { PortfolioEditor } from './portfolio-editor';

const examplePdf = new File(['%PDF-1.7'], 'portfolio.pdf', { type: 'application/pdf' });
const replacementPdf = new File(['%PDF-1.7'], 'portfolio-updated.pdf', { type: 'application/pdf' });
const exampleItem = {
  id: 'portfolio-1',
  title: '서비스 기획 및 UX 리서치 포트폴리오',
  file: examplePdf,
};

const meta = {
  title: 'Preparation/PortfolioEditor',
  component: PortfolioEditor,
  parameters: { layout: 'fullscreen' },
  args: { onSaveDraft: fn() },
} satisfies Meta<typeof PortfolioEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

function dropFile(target: HTMLElement, file: File) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  return fireEvent(
    target,
    new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
  );
}

export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: '포트폴리오 제목' })).toHaveValue('');
    await expect(canvas.getByRole('button', { name: '파일 선택' })).toBeVisible();
    const documents = within(canvas.getByRole('navigation', { name: '작성 필요 서류' }));
    await expect(documents.getByText('포트폴리오')).toHaveAttribute('aria-current', 'page');
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('value', '0');
    await expect(canvas.getByRole('button', { name: '임시 저장' })).toBeVisible();
  },
};

export const PdfSelected: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: '포트폴리오 제목' }), '서비스 기획');
    await userEvent.upload(canvas.getByLabelText('포트폴리오 PDF 파일'), examplePdf);

    await expect(canvas.getByText(examplePdf.name, { exact: true })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '파일 변경' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));

    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      items: [],
      editingItem: { id: null, title: '서비스 기획', file: examplePdf },
    });
  },
};

export const Editing: Story = {
  args: { initialItems: [exampleItem] },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: `${exampleItem.title} 수정` }));
    const titleInput = canvas.getByRole('textbox', { name: '포트폴리오 제목' });
    const dropZone = canvas.getByRole('group', { name: 'PDF 파일 첨부' });
    await expect(titleInput).toHaveValue(exampleItem.title);

    await dropFile(dropZone, new File(['example'], 'portfolio.txt', { type: 'text/plain' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('PDF 파일을 선택해주세요.');
    await expect(within(dropZone).getByText(examplePdf.name, { exact: true })).toBeVisible();

    await dropFile(dropZone, replacementPdf);
    await expect(
      await within(dropZone).findByText(replacementPdf.name, { exact: true }),
    ).toBeVisible();
    await expect(canvas.queryByRole('alert')).toBeNull();

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, '수정한 포트폴리오');
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));

    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      items: [exampleItem],
      editingItem: { id: exampleItem.id, title: '수정한 포트폴리오', file: replacementPdf },
    });
  },
};

export const ManageItems: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.upload(canvas.getByLabelText('포트폴리오 PDF 파일'), examplePdf);
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));
    const items = within(canvas.getByRole('list', { name: '등록한 포트폴리오' }));
    await expect(items.getByRole('heading', { name: examplePdf.name })).toBeVisible();
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('value', '100');

    await userEvent.click(canvas.getByRole('button', { name: '포트폴리오 추가' }));
    await expect(canvas.getByRole('form', { name: '포트폴리오 등록' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '취소' }));

    await userEvent.click(items.getByRole('button', { name: `${examplePdf.name} 수정` }));
    await userEvent.type(canvas.getByRole('textbox', { name: '포트폴리오 제목' }), ' 수정');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));
    const updatedTitle = `${examplePdf.name} 수정`;
    await expect(items.getByRole('heading', { name: updatedTitle })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      items: [{ id: expect.any(String), title: updatedTitle, file: examplePdf }],
      editingItem: null,
    });

    await userEvent.click(items.getByRole('button', { name: `${updatedTitle} 삭제` }));
    await expect(canvas.queryByRole('list', { name: '등록한 포트폴리오' })).toBeNull();
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('value', '0');
  },
};
