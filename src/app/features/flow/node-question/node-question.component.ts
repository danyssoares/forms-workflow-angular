import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild, inject } from '@angular/core';
import { NgIf, TitleCasePipe } from '@angular/common';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faComment, faStar, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { GraphNode } from '../graph.types';
import { TranslationPipe } from '@angulartoolsdr/translation';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-node-question',
  standalone: true,
  imports: [NgIf, FontAwesomeModule, TitleCasePipe, TranslationPipe, MatTooltipModule],
  templateUrl: './node-question.component.html',
  styleUrl: './node-question.component.scss'
})
export class NodeQuestionComponent implements AfterViewInit, OnChanges {
  @Input() node!: GraphNode;
  @ViewChild('labelEl') labelEl?: ElementRef<HTMLDivElement>;

  library = inject(FaIconLibrary);
  private readonly cdr = inject(ChangeDetectorRef);

  faComment = faComment;
  faStar = faStar;
  faInfoCircle = faInfoCircle;
  showOverflowIndicator = false;

  constructor() {
    this.library.addIcons(faComment, faStar, faInfoCircle);
  }

  ngAfterViewInit(): void {
    this.updateOverflowIndicator();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node']) {
      setTimeout(() => this.updateOverflowIndicator());
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.updateOverflowIndicator();
  }

  showTooltip(tooltip: MatTooltip, event: Event) {
    event.stopPropagation();
    if ('preventDefault' in event) {
      (event as Event).preventDefault();
    }
    tooltip.show();
  }

  hideTooltip(tooltip: MatTooltip) {
    tooltip.hide(0);
  }

  private updateOverflowIndicator(): void {
    const el = this.labelEl?.nativeElement;
    if (!el) return;
    const clamped = el.scrollHeight > el.clientHeight + 1;
    if (clamped !== this.showOverflowIndicator) {
      this.showOverflowIndicator = clamped;
      this.cdr.markForCheck();
    }
  }
}
