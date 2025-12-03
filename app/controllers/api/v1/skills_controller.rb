class Api::V1::SkillsController < ApplicationController
  # No authentication required for skills (public data)
  before_action :set_cors_headers

  def index
    skills = Skill.active.ordered
    render json: {
      status: "success",
      data: skills.as_json(only: [ :id, :name ])
    }
  end

  def create
    skill = Skill.new(skill_params)

    if skill.save
      ActivityLog.create!(
        entity_type: "Skill",
        entity_id: skill.id,
        action: "create",
        metadata: { skill_name: skill.name }
      )

      render json: {
        status: "success",
        data: skill
      }
    else
      render json: {
        status: "error",
        errors: skill.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  private

  def skill_params
    params.require(:skill).permit(:name, :display_order, :active)
  end

  private

  def set_cors_headers
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5175"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "Origin, Content-Type, Accept, Authorization, X-Requested-With"
  end
end
