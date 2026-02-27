import { AppConfiguration } from 'src/app/app-configuration';
import { XmlJsElement } from './xml-js-element';
import { AltoVersionContent } from './alto-version';
import { CurrentUser, UserInfo } from './user-info';

export class AppState {
  // Users (set by loadCurrentUser when logged in, cleared on logout)
  currentUser: CurrentUser | null = null;
  krameriusUsers: UserInfo[] = [];
  engineUsers: UserInfo[] = [];

  currentAltoVersion: AltoVersionContent;

  config: AppConfiguration;
  altoXml: string;
  alto: any;
  printSpace: XmlJsElement;
  alto0Xml: string;
  alto0: any;
  printSpace0: XmlJsElement;
  currentObject: any;

  selectedAlto: {
    blocks: XmlJsElement[];
    lines: XmlJsElement[];
    words: XmlJsElement[];
  };
  selectedBlocks: XmlJsElement[] = [];
  selectedLines: XmlJsElement[] = [];
  selectedWords: XmlJsElement[] = [];

  /** Get ALTO Page WIDTH/HEIGHT for coordinate scaling (mm10 or pixels). */
  getAltoPageBounds(alto: any): { width: number; height: number } | null {
    try {
      const layout = alto?.elements?.[0]?.elements?.find((e: XmlJsElement) => e.name === 'Layout');
      const page = layout?.elements?.find((e: XmlJsElement) => e.name === 'Page');
      const w = page?.attributes?.['WIDTH'];
      const h = page?.attributes?.['HEIGHT'];
      if (w != null && h != null) {
        const nw = parseFloat(String(w));
        const nh = parseFloat(String(h));
        return isNaN(nw) || isNaN(nh) ? null : { width: nw, height: nh };
      }
    } catch (_) {}
    return null;
  }

  setPrintSpace(alto: any) {
    return alto.elements[0].elements
      .find((e: XmlJsElement) => e.name === 'Layout')
      .elements.find((e: XmlJsElement) => e.name === 'Page')
      .elements.find((e: XmlJsElement) => e.name === 'PrintSpace');
  }

  clearSelection() {
    this.selectedBlocks = [];
    this.selectedLines = [];
    this.selectedWords = [];
    this.selectedAlto = {
      blocks: this.selectedBlocks,
      lines: this.selectedLines,
      words: this.selectedWords,
    };
  }

  getAltoDescription(alto: any) {
    return alto.elements[0].elements
      .find((e: XmlJsElement) => e.name === 'Description')
      .elements.find((e: XmlJsElement) => e.name === 'OCRProcessing')
      .elements.find((e: XmlJsElement) => e.name === 'ocrProcessingStep');
  }
}
