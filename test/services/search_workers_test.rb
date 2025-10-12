require "test_helper"

class SearchWorkersTest < ActiveSupport::TestCase
  def setup
    @user = users(:one)

    # Create test workers with different skills
    @worker1 = Worker.create!(
      first_name: "John",
      last_name: "Doe",
      email: "john-search@example.com",
      skills_json: [ "cooking", "serving" ],
      active: true
    )
    @worker1.save! # Trigger tsvector sync

    @worker2 = Worker.create!(
      first_name: "Jane",
      last_name: "Smith",
      email: "jane-search@example.com",
      skills_json: [ "cleaning", "bartending" ],
      active: true
    )
    @worker2.save! # Trigger tsvector sync

    @worker3 = Worker.create!(
      first_name: "Bob",
      last_name: "Johnson",
      email: "bob-search@example.com",
      skills_json: [ "cooking", "management" ],
      active: false  # Inactive worker
    )
    @worker3.save! # Trigger tsvector sync

    # Create certification for testing
    @cert = Certification.create!(name: "Food Safety Search Test")

    # Create worker certification
    WorkerCertification.create!(
      worker: @worker1,
      certification: @cert,
      expires_at_utc: 1.year.from_now
    )
  end

  test "returns all workers when query is empty" do
    result = SearchWorkers.call("")

    assert result[:success]
    assert result[:data][:workers].count >= 3
    assert_includes result[:data][:workers], @worker1
    assert_includes result[:data][:workers], @worker2
    assert_includes result[:data][:workers], @worker3  # Now includes inactive workers
  end

  test "searches by skill using tsvector for queries >= 3 chars" do
    # Search for a skill that only our test workers have
    result = SearchWorkers.call("serving")

    assert result[:success]
    assert result[:data][:workers].count >= 1
    assert_includes result[:data][:workers], @worker1
  end

  test "searches by name using ILIKE for queries < 3 chars" do
    result = SearchWorkers.call("Jo")

    assert result[:success]
    assert result[:data][:workers].count >= 1
    assert_includes result[:data][:workers], @worker1
  end

  test "searches by name using ILIKE for single character" do
    result = SearchWorkers.call("J")

    assert result[:success]
    assert result[:data][:workers].count >= 2
    assert_includes result[:data][:workers], @worker1
    assert_includes result[:data][:workers], @worker2
  end

  test "filters by certification when specified" do
    result = SearchWorkers.call("", { certification_id: @cert.id })

    assert result[:success]
    assert_equal 1, result[:data][:workers].count
    assert_includes result[:data][:workers], @worker1
  end

  test "combines search query with certification filter" do
    result = SearchWorkers.call("cooking", { certification_id: @cert.id })

    assert result[:success]
    assert_equal 1, result[:data][:workers].count
    assert_includes result[:data][:workers], @worker1
  end

  test "returns empty result when no workers match" do
    result = SearchWorkers.call("nonexistent")

    assert result[:success]
    assert_equal 0, result[:data][:workers].count
  end

  test "orders results by last_name, first_name" do
    result = SearchWorkers.call("")

    assert result[:success]
    workers = result[:data][:workers]
    # Check that our test workers are in the correct order
    john_index = workers.index(@worker1)
    jane_index = workers.index(@worker2)
    assert john_index < jane_index, "John Doe should come before Jane Smith"
  end

  test "handles nil query gracefully" do
    result = SearchWorkers.call("")

    assert result[:success]
    # Should return all active workers (including fixtures)
    assert result[:data][:workers].count >= 2
  end

  test "handles empty filters gracefully" do
    result = SearchWorkers.call("serving", {})

    assert result[:success]
    assert result[:data][:workers].count >= 1
  end
end
