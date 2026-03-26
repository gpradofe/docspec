package com.waypoint.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Persistent entity representing a milestone within a curriculum.
 */
@Entity
@Table(name = "milestones")
public class MilestoneEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String title;

    private int orderIndex;

    @ManyToOne
    @JoinColumn(name = "curriculum_id")
    private CurriculumEntity curriculum;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }

    public CurriculumEntity getCurriculum() {
        return curriculum;
    }

    public void setCurriculum(CurriculumEntity curriculum) {
        this.curriculum = curriculum;
    }
}
